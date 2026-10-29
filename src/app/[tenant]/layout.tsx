import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  const tenantSlug = resolvedParams.tenant;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { themeBgColor: true, themeButtonColor: true },
  });

  if (!tenant) {
    notFound();
  }

  // Cor de fundo do tenant: se não tiver ou for quase preto (#0f0f0f, etc), usamos fundo clean moderno (#F8FAFC)
  const isDark = (c: string) => ["#0f0f0f", "#000000", "#0a0a0a", "#111827", "#18181b"].includes(c.toLowerCase());
  const effectiveBgColor = tenant.themeBgColor && !isDark(tenant.themeBgColor) 
    ? tenant.themeBgColor 
    : "#F8FAFC";

  // Inject dynamic theme variables into the root layout of the tenant
  const style = {
    "--color-background": effectiveBgColor,
    "--background": effectiveBgColor,
    backgroundColor: effectiveBgColor,
    color: "#0f172a",
    ...(tenant.themeButtonColor && {
      "--color-primary": tenant.themeButtonColor,
      "--color-primary-hover": tenant.themeButtonColor,
    }),
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen">
      {children}
    </div>
  );
}
