"use client";

import { useState } from "react";
import { toggleTenantStatus } from "@/actions/superadmin";
import { useRouter } from "next/navigation";

export default function TenantToggleButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isActive);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    const result = await toggleTenantStatus(id, !active);
    if (result.success) {
      setActive(!active);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-50"
      style={{
        background: active ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
        color: active ? "#10b981" : "#ef4444",
        border: `1px solid ${active ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: active ? "#10b981" : "#ef4444" }} />
      {loading ? "..." : active ? "Ativa" : "Inativa"}
    </button>
  );
}
