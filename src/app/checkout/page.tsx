import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, select: { id: true, name: true, price: true, features: true }, orderBy: { price: "asc" } });
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-400 text-sm font-medium animate-pulse">Carregando formulário...</p>
        </div>
      </div>
    }>
      {plans.length > 0 ? <CheckoutClient plans={plans} /> : <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center"><p>Nenhum plano está disponível no momento.</p></div>}
    </Suspense>
  );
}
