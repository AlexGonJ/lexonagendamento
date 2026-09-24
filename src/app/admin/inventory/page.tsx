import { notFound, redirect } from "next/navigation";
import { getCurrentSession } from "@/actions/auth";
import prisma from "@/lib/prisma";
import { getInventorySnapshot } from "@/actions/inventory";
import InventoryClient from "./InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!session.isAdmin) notFound();

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.tenantId },
    select: { features: true },
  });
  if (!tenant?.features.includes("inventory")) notFound();

  const inventory = await getInventorySnapshot();
  return <InventoryClient {...inventory} />;
}
