import { redirect } from "next/navigation";
import { checkSuperAdminAuth } from "@/actions/superadmin";
import SuperAdminLayoutClient from "../SuperAdminLayoutClient";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authorized = await checkSuperAdminAuth();

  if (!authorized) {
    redirect("/super-admin/login");
  }

  return <SuperAdminLayoutClient>{children}</SuperAdminLayoutClient>;
}
