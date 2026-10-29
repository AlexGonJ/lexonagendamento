"use server";

import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getCurrentSession } from "@/actions/auth";
import { recordAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const inventoryPath = "/admin/inventory";

async function requireInventoryAdmin({ advanced = false }: { advanced?: boolean } = {}) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Não autenticado.");
  if (!session.isAdmin) throw new Error("Apenas administradores podem gerenciar o estoque.");

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { features: true },
  });
  if (!tenant?.features.includes("inventory")) {
    throw new Error("O plano deste estabelecimento não inclui controle de estoque.");
  }
  if (advanced && !tenant.features.includes("inventory_advanced")) {
    throw new Error("O plano deste estabelecimento não inclui alertas de reposição.");
  }

  return { ...session, hasAdvancedInventory: tenant.features.includes("inventory_advanced") };
}

function parseQuantity(value: FormDataEntryValue | null, { allowZero = false } = {}) {
  const raw = typeof value === "string" ? value.trim().replace(",", ".") : "";
  if (!/^(?:\d{1,9})(?:\.\d{1,3})?$/.test(raw)) return null;
  const quantity = new Prisma.Decimal(raw);
  if (allowZero ? quantity.isNegative() : !quantity.greaterThan(0)) return null;
  return quantity;
}

export async function getInventorySnapshot() {
  const session = await requireInventoryAdmin();
  const [products, movements] = await Promise.all([
    prisma.inventoryProduct.findMany({
      where: { tenantId: session.tenantId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        quantity: true,
        minimumQuantity: true,
        costCents: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.inventoryMovement.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        quantityDelta: true,
        quantityAfter: true,
        note: true,
        createdAt: true,
        product: { select: { id: true, name: true, unit: true } },
        recordedBy: { select: { name: true } },
      },
    }),
  ]);

  return {
    hasAdvancedInventory: session.hasAdvancedInventory,
    products: products.map((product) => ({
      ...product,
      quantity: product.quantity.toString(),
      minimumQuantity: product.minimumQuantity.toString(),
    })),
    movements: movements.map((movement) => ({
      ...movement,
      quantityDelta: movement.quantityDelta.toString(),
      quantityAfter: movement.quantityAfter.toString(),
    })),
  };
}

export async function createInventoryProduct(formData: FormData) {
  const session = await requireInventoryAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const sku = String(formData.get("sku") || "").trim().slice(0, 50) || null;
  const unit = String(formData.get("unit") || "un").trim().slice(0, 12);
  const description = String(formData.get("description") || "").trim().slice(0, 500) || null;
  const quantity = parseQuantity(formData.get("initialQuantity"), { allowZero: true });
  const minimumQuantity = session.hasAdvancedInventory
    ? parseQuantity(formData.get("minimumQuantity"), { allowZero: true })
    : new Prisma.Decimal(0);
  const costRaw = String(formData.get("cost") || "").trim().replace(",", ".");
  const cost = costRaw === "" ? null : Number(costRaw);

  if (!name || !unit || !quantity || !minimumQuantity) {
    return { success: false, error: "Confira nome, unidade e quantidades informadas." };
  }
  if (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 10000000)) {
    return { success: false, error: "Informe um custo unitário válido." };
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryProduct.create({
        data: {
          tenantId: session.tenantId,
          name,
          sku,
          unit,
          quantity,
          minimumQuantity,
          costCents: cost === null ? null : Math.round(cost * 100),
          description,
        },
      });

      if (!quantity.isZero()) {
        await tx.inventoryMovement.create({
          data: {
            tenantId: session.tenantId,
            productId: created.id,
            recordedById: session.userId,
            type: "INITIAL",
            quantityDelta: quantity,
            quantityAfter: quantity,
            note: "Saldo inicial",
          },
        });
      }
      return created;
    });

    await recordAuditEvent({
      tenantId: session.tenantId,
      actorId: session.userId,
      actorRole: "ADMIN",
      action: "INVENTORY_PRODUCT_CREATED",
      entityType: "INVENTORY_PRODUCT",
      entityId: product.id,
      metadata: { sku, initialQuantity: quantity.toString() },
    });
    revalidatePath(inventoryPath);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Já existe um produto com esse SKU neste estabelecimento." };
    }
    console.error("Erro ao cadastrar produto de estoque", error);
    return { success: false, error: "Não foi possível cadastrar o produto." };
  }
}

export async function recordInventoryMovement(data: {
  productId: string;
  kind: "IN" | "OUT" | "ADJUSTMENT";
  quantity: string;
  note?: string;
}) {
  const session = await requireInventoryAdmin();
  const submittedQuantity = parseQuantity(data.quantity, { allowZero: data.kind === "ADJUSTMENT" });
  if (!submittedQuantity || !["IN", "OUT", "ADJUSTMENT"].includes(data.kind)) {
    return { success: false, error: "Informe um tipo e uma quantidade válidos." };
  }

  try {
    const movement = await prisma.$transaction(async (tx) => {
      // O lock retorna VOID; executeRaw evita que o Prisma tente desserializar esse retorno.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`inventory:${session.tenantId}:${data.productId}`}))`;
      const product = await tx.inventoryProduct.findFirst({
        where: { id: data.productId, tenantId: session.tenantId, isActive: true },
        select: { id: true, quantity: true },
      });
      if (!product) throw new Error("Produto não encontrado neste estabelecimento.");

      const delta = data.kind === "IN"
        ? submittedQuantity
        : data.kind === "OUT"
          ? submittedQuantity.negated()
          : submittedQuantity.minus(product.quantity);
      const quantityAfter = product.quantity.plus(delta);
      if (quantityAfter.isNegative()) throw new Error("A saída não pode deixar o estoque negativo.");

      await tx.inventoryProduct.update({
        where: { id: product.id },
        data: { quantity: quantityAfter },
      });
      return tx.inventoryMovement.create({
        data: {
          tenantId: session.tenantId,
          productId: product.id,
          recordedById: session.userId,
          type: data.kind,
          quantityDelta: delta,
          quantityAfter,
          note: data.note?.trim().slice(0, 300) || null,
        },
        select: { id: true, type: true, quantityDelta: true },
      });
    });

    await recordAuditEvent({
      tenantId: session.tenantId,
      actorId: session.userId,
      actorRole: "ADMIN",
      action: "INVENTORY_MOVEMENT_RECORDED",
      entityType: "INVENTORY_MOVEMENT",
      entityId: movement.id,
      metadata: { productId: data.productId, type: movement.type, quantityDelta: movement.quantityDelta.toString() },
    });
    revalidatePath(inventoryPath);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && [
      "Produto não encontrado neste estabelecimento.",
      "A saída não pode deixar o estoque negativo.",
    ].includes(error.message)) {
      return { success: false, error: error.message };
    }
    console.error("Erro ao registrar movimentação de estoque", error);
    return { success: false, error: "Não foi possível registrar a movimentação." };
  }
}

export async function updateInventoryProduct(data: {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  cost: string;
  minimumQuantity?: string;
}) {
  const session = await requireInventoryAdmin();
  const name = data.name.trim().slice(0, 100);
  const sku = data.sku.trim().slice(0, 50) || null;
  const unit = data.unit.trim().slice(0, 12);
  const costRaw = data.cost.trim().replace(",", ".");
  const cost = costRaw === "" ? null : Number(costRaw);
  const minimumQuantity = session.hasAdvancedInventory
    ? parseQuantity(data.minimumQuantity ?? "", { allowZero: true })
    : new Prisma.Decimal(0);

  if (!name || !unit || !minimumQuantity || (cost !== null && (!Number.isFinite(cost) || cost < 0 || cost > 10000000))) {
    return { success: false, error: "Confira os dados do produto." };
  }

  try {
    const updated = await prisma.inventoryProduct.updateMany({
      where: { id: data.productId, tenantId: session.tenantId, isActive: true },
      data: { name, sku, unit, minimumQuantity, costCents: cost === null ? null : Math.round(cost * 100) },
    });
    if (!updated.count) return { success: false, error: "Produto não encontrado neste estabelecimento." };
    await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "INVENTORY_PRODUCT_UPDATED", entityType: "INVENTORY_PRODUCT", entityId: data.productId });
    revalidatePath(inventoryPath);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Já existe um produto com esse SKU neste estabelecimento." };
    }
    console.error("Erro ao atualizar produto de estoque", error);
    return { success: false, error: "Não foi possível atualizar o produto." };
  }
}

export async function archiveInventoryProduct(productId: string) {
  const session = await requireInventoryAdmin();
  const archived = await prisma.inventoryProduct.updateMany({
    where: { id: productId, tenantId: session.tenantId, isActive: true },
    data: { isActive: false },
  });
  if (!archived.count) return { success: false, error: "Produto não encontrado neste estabelecimento." };
  await recordAuditEvent({ tenantId: session.tenantId, actorId: session.userId, actorRole: "ADMIN", action: "INVENTORY_PRODUCT_ARCHIVED", entityType: "INVENTORY_PRODUCT", entityId: productId });
  revalidatePath(inventoryPath);
  return { success: true };
}
