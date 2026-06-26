import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import SuperAdminLayoutClient from "../SuperAdminLayoutClient";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("super_admin_token");
  const validSecret = process.env.SUPER_ADMIN_SECRET;

  if (!token?.value || token.value !== validSecret) {
    redirect("/super-admin/login");
  }

  return <SuperAdminLayoutClient>{children}</SuperAdminLayoutClient>;
}