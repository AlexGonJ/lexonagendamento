"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowDownLeft, ArrowUpRight, Bell, Boxes, History, Pencil, Plus, Save, X } from "lucide-react";
import {
  archiveInventoryProduct,
  createInventoryProduct,
  recordInventoryMovement,
  updateInventoryProduct,
} from "@/actions/inventory";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: string;
  minimumQuantity: string;
  costCents: number | null;
  description: string | null;
  createdAt: Date;
};

type Movement = {
  id: string;
  type: string;
  quantityDelta: string;
  quantityAfter: string;
  note: string | null;
  createdAt: Date;
  product: { id: string; name: string; unit: string };
  recordedBy: { name: string } | null;
};

export default function InventoryClient({
  products,
  movements,
  hasAdvancedInventory,
}: {
  products: Product[];
  movements: Movement[];
  hasAdvancedInventory: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [movementForms, setMovementForms] = useState<Record<string, { kind: "IN" | "OUT" | "ADJUSTMENT"; quantity: string; note: string }>>({});

  const lowStockProducts = useMemo(
    () => hasAdvancedInventory
      ? products.filter((product) => Number(product.minimumQuantity) > 0 && Number(product.quantity) <= Number(product.minimumQuantity))
      : [],
    [hasAdvancedInventory, products],
  );

  function resetFeedback() {
    setFeedback("");
    setError("");
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    resetFeedback();
    const result = await createInventoryProduct(new FormData(formElement));
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Não foi possível salvar o produto.");
      return;
    }
    formElement.reset();
    setShowForm(false);
    setFeedback("Produto cadastrado.");
    router.refresh();
  }

  async function handleMovement(event: React.FormEvent<HTMLFormElement>, productId: string) {
    event.preventDefault();
    setSaving(true);
    resetFeedback();
    const form = movementForms[productId] || { kind: "IN", quantity: "", note: "" };
    const result = await recordInventoryMovement({ productId, ...form });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Não foi possível registrar a movimentação.");
      return;
    }
    setMovementForms((previous) => ({ ...previous, [productId]: { ...form, quantity: "", note: "" } }));
    setFeedback("Movimentação registrada.");
    router.refresh();
  }

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    resetFeedback();
    const formData = new FormData(event.currentTarget);
    const result = await updateInventoryProduct({
      productId: editingProduct.id,
      name: String(formData.get("name") || ""),
      sku: String(formData.get("sku") || ""),
      unit: String(formData.get("unit") || ""),
      cost: String(formData.get("cost") || ""),
      minimumQuantity: String(formData.get("minimumQuantity") || ""),
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error || "Não foi possível atualizar o produto.");
      return;
    }
    setEditingProduct(null);
    setFeedback("Produto atualizado.");
    router.refresh();
  }

  async function handleArchive(product: Product) {
    if (!window.confirm(`Arquivar ${product.name}? O histórico de movimentações será preservado.`)) return;
    resetFeedback();
    const result = await archiveInventoryProduct(product.id);
    if (!result.success) {
      setError(result.error || "Não foi possível arquivar o produto.");
      return;
    }
    setFeedback("Produto arquivado; o histórico foi preservado.");
    router.refresh();
  }

  function movementForm(productId: string) {
    return movementForms[productId] || { kind: "IN" as const, quantity: "", note: "" };
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">Operação</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950">Estoque</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">Cadastre produtos e acompanhe cada entrada, saída e ajuste com histórico por usuário.</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm((open) => !open); setEditingProduct(null); resetFeedback(); }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          {showForm ? <X size={17} /> : <Plus size={17} />}
          {showForm ? "Fechar cadastro" : "Adicionar produto"}
        </button>
      </div>

      {(feedback || error) && (
        <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {error || feedback}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700"><Boxes size={23} /></div>
          <div><p className="text-sm text-gray-500">Produtos ativos</p><p className="text-2xl font-bold text-gray-950">{products.length}</p></div>
        </div>
        {hasAdvancedInventory ? (
          <div className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-800"><Bell size={22} /></div>
            <div><p className="text-sm text-amber-900">Abaixo do mínimo</p><p className="text-2xl font-bold text-amber-950">{lowStockProducts.length}</p></div>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gray-100 text-gray-600"><History size={22} /></div>
            <div><p className="text-sm text-gray-500">Movimentações registradas</p><p className="text-2xl font-bold text-gray-950">{movements.length}</p></div>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-5 text-lg font-semibold text-gray-950">Novo produto</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome do produto"><input name="name" required maxLength={100} placeholder="Ex.: Pomada modeladora" className={inputClass} /></Field>
            <Field label="SKU (opcional)"><input name="sku" maxLength={50} placeholder="PROD-001" className={inputClass} /></Field>
            <Field label="Unidade"><input name="unit" required maxLength={12} defaultValue="un" placeholder="un, ml, g" className={inputClass} /></Field>
            <Field label="Saldo inicial"><input name="initialQuantity" type="number" min="0" max="999999999" step="0.001" defaultValue="0" required className={inputClass} /></Field>
            {hasAdvancedInventory && <Field label="Alertar quando chegar a"><input name="minimumQuantity" type="number" min="0" max="999999999" step="0.001" defaultValue="0" required className={inputClass} /></Field>}
            <Field label="Custo unitário (R$)"><input name="cost" type="number" min="0" max="10000000" step="0.01" placeholder="Opcional" className={inputClass} /></Field>
            <Field label="Descrição (opcional)" className="sm:col-span-2 lg:col-span-3"><input name="description" maxLength={500} placeholder="Detalhes para identificar o produto" className={inputClass} /></Field>
          </div>
          <div className="mt-5 flex justify-end">
            <button disabled={saving} className={primaryButtonClass}><Plus size={16} />{saving ? "Salvando…" : "Cadastrar produto"}</button>
          </div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6">
          <h2 className="font-semibold text-gray-950">Produtos</h2>
          <p className="mt-1 text-sm text-gray-500">Saldo atual e registro rápido de movimentação.</p>
        </div>
        {products.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Boxes className="mx-auto text-gray-300" size={34} />
            <p className="mt-3 font-medium text-gray-800">Nenhum produto cadastrado</p>
            <p className="mt-1 text-sm text-gray-500">Adicione o primeiro produto para começar o controle do estoque.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {products.map((product) => {
              const isLow = hasAdvancedInventory && Number(product.minimumQuantity) > 0 && Number(product.quantity) <= Number(product.minimumQuantity);
              const form = movementForm(product.id);
              return (
                <article key={product.id} className="grid gap-5 p-5 lg:grid-cols-[minmax(180px,1fr)_minmax(300px,1.15fr)_auto] lg:items-center lg:px-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-gray-950">{product.name}</h3>
                      {isLow && <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900">Reposição</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{product.sku ? `SKU ${product.sku} · ` : ""}{product.unit}</p>
                    <p className={`mt-3 text-2xl font-bold ${isLow ? "text-amber-800" : "text-gray-950"}`}>
                      {formatQuantity(product.quantity)} <span className="text-sm font-medium text-gray-500">{product.unit}</span>
                    </p>
                    {hasAdvancedInventory && Number(product.minimumQuantity) > 0 && <p className="mt-1 text-xs text-gray-500">Mínimo: {formatQuantity(product.minimumQuantity)} {product.unit}</p>}
                  </div>

                  <form onSubmit={(event) => handleMovement(event, product.id)} className="grid gap-2 sm:grid-cols-[130px_1fr_1fr_auto]">
                    <label className="sr-only" htmlFor={`movement-type-${product.id}`}>Tipo de movimentação</label>
                    <select
                      id={`movement-type-${product.id}`}
                      value={form.kind}
                      onChange={(event) => setMovementForms((previous) => ({ ...previous, [product.id]: { ...form, kind: event.target.value as typeof form.kind } }))}
                      className={inputClass}
                    >
                      <option value="IN">Entrada</option>
                      <option value="OUT">Saída</option>
                      <option value="ADJUSTMENT">Ajuste de saldo</option>
                    </select>
                    <label className="sr-only" htmlFor={`movement-quantity-${product.id}`}>{form.kind === "ADJUSTMENT" ? "Novo saldo" : "Quantidade"}</label>
                    <input
                      id={`movement-quantity-${product.id}`}
                      type="number"
                      min="0"
                      step="0.001"
                      required
                      value={form.quantity}
                      onChange={(event) => setMovementForms((previous) => ({ ...previous, [product.id]: { ...form, quantity: event.target.value } }))}
                      placeholder={form.kind === "ADJUSTMENT" ? "Novo saldo" : "Quantidade"}
                      className={inputClass}
                    />
                    <label className="sr-only" htmlFor={`movement-note-${product.id}`}>Observação</label>
                    <input
                      id={`movement-note-${product.id}`}
                      value={form.note}
                      onChange={(event) => setMovementForms((previous) => ({ ...previous, [product.id]: { ...form, note: event.target.value } }))}
                      maxLength={300}
                      placeholder="Observação (opcional)"
                      className={inputClass}
                    />
                    <button disabled={saving} aria-label={`Registrar movimentação de ${product.name}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60">
                      {form.kind === "OUT" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      Registrar
                    </button>
                  </form>

                  <div className="flex gap-2 lg:justify-end">
                    <button type="button" onClick={() => { setEditingProduct(product); setShowForm(false); resetFeedback(); }} className={iconButtonClass} aria-label={`Editar ${product.name}`} title="Editar produto"><Pencil size={16} /></button>
                    <button type="button" onClick={() => handleArchive(product)} className={`${iconButtonClass} text-red-600 hover:bg-red-50`} aria-label={`Arquivar ${product.name}`} title="Arquivar produto"><Archive size={16} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {editingProduct && (
        <form onSubmit={handleUpdate} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div><h2 className="font-semibold text-gray-950">Editar produto</h2><p className="mt-1 text-sm text-gray-500">O saldo é alterado pela movimentação, para manter o histórico correto.</p></div>
            <button type="button" onClick={() => setEditingProduct(null)} className={iconButtonClass} aria-label="Fechar edição"><X size={17} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Nome"><input name="name" required defaultValue={editingProduct.name} maxLength={100} className={inputClass} /></Field>
            <Field label="SKU"><input name="sku" defaultValue={editingProduct.sku || ""} maxLength={50} className={inputClass} /></Field>
            <Field label="Unidade"><input name="unit" required defaultValue={editingProduct.unit} maxLength={12} className={inputClass} /></Field>
            <Field label="Custo unitário (R$)"><input name="cost" type="number" min="0" max="10000000" step="0.01" defaultValue={editingProduct.costCents === null ? "" : (editingProduct.costCents / 100).toFixed(2)} className={inputClass} /></Field>
            {hasAdvancedInventory && <Field label="Alertar quando chegar a"><input name="minimumQuantity" type="number" min="0" step="0.001" defaultValue={editingProduct.minimumQuantity} className={inputClass} />
            </Field>}
          </div>
          <div className="mt-5 flex justify-end"><button disabled={saving} className={primaryButtonClass}><Save size={16} />{saving ? "Salvando…" : "Salvar alterações"}</button></div>
        </form>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 sm:px-6"><h2 className="font-semibold text-gray-950">Movimentações recentes</h2><p className="mt-1 text-sm text-gray-500">Últimos 30 registros do estabelecimento.</p></div>
        {movements.length === 0 ? <p className="px-6 py-10 text-center text-sm text-gray-500">As movimentações aparecerão aqui.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Data</th><th className="px-5 py-3">Produto</th><th className="px-5 py-3">Tipo</th><th className="px-5 py-3">Variação</th><th className="px-5 py-3">Saldo após</th><th className="px-5 py-3">Responsável</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{movements.map((movement) => (
                <tr key={movement.id}>
                  <td className="whitespace-nowrap px-5 py-3 text-gray-600">{new Date(movement.createdAt).toLocaleString("pt-BR")}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{movement.product.name}{movement.note && <span className="block max-w-64 truncate text-xs font-normal text-gray-500">{movement.note}</span>}</td>
                  <td className="px-5 py-3 text-gray-600">{movementTypeLabel(movement.type)}</td>
                  <td className={`px-5 py-3 font-semibold ${Number(movement.quantityDelta) < 0 ? "text-red-700" : "text-emerald-700"}`}>{Number(movement.quantityDelta) > 0 ? "+" : ""}{formatQuantity(movement.quantityDelta)} {movement.product.unit}</td>
                  <td className="px-5 py-3 text-gray-700">{formatQuantity(movement.quantityAfter)} {movement.product.unit}</td>
                  <td className="px-5 py-3 text-gray-600">{movement.recordedBy?.name || "Usuário removido"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{label}<span className="mt-1.5 block">{children}</span></label>;
}

function formatQuantity(value: string) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value));
}

function movementTypeLabel(type: string) {
  return ({ INITIAL: "Saldo inicial", IN: "Entrada", OUT: "Saída", ADJUSTMENT: "Ajuste" } as Record<string, string>)[type] || type;
}

const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
const iconButtonClass = "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100";
