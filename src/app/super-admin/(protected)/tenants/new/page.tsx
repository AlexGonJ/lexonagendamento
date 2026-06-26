import { getPlans } from "@/actions/superadmin";
import { AVAILABLE_FEATURES } from "@/lib/features";
import NewTenantForm from "./NewTenantForm";

export default async function NewTenantPage() {
  const plans = await getPlans();
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Nova Loja</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Cadastrar um novo estabelecimento no sistema</p>
      </div>
      <NewTenantForm plans={plans} features={AVAILABLE_FEATURES as any} />
    </div>
  );
}
