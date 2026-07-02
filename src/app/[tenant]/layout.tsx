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

  // Inject dynamic theme variables into the root layout of the tenant
  const style = {
    ...(tenant.themeBgColor && {
      "--color-background": tenant.themeBgColor,
      "--background": tenant.themeBgColor,
      "backgroundColor": tenant.themeBgColor, // fallback for root
    }),
    ...(tenant.themeButtonColor && {
      "--color-primary": tenant.themeButtonColor,
      "--color-primary-hover": tenant.themeButtonColor, // For simplicity, we can reuse it or darken it. We'll stick to primary.
    }),
  } as React.CSSProperties;

  return (
    <div style={style} className="min-h-screen">
      {children}
    </div>
  );
}
