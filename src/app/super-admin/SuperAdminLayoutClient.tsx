"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { superAdminLogout } from "@/actions/superadmin";

const navItems = [
  { href: "/super-admin", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", exact: true },
  { href: "/super-admin/tenants", label: "Lojas", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", exact: false },
  { href: "/super-admin/plans", label: "Planos", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", exact: false },
];

export default function SuperAdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif", background: "#0f0f17" }}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col lg:static lg:h-screen transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ width: 256, background: "linear-gradient(180deg, #13131f 0%, #0f0f17 100%)", borderRight: "1px solid rgba(139,92,246,0.15)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid rgba(139,92,246,0.12)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
              SA
            </div>
            <div>
              <p className="text-white font-bold text-sm">Super Admin</p>
              <p className="text-xs" style={{ color: "#a855f7" }}>Sistema Global</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: active ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.1))" : "transparent",
                  color: active ? "#c4b5fd" : "#6b7280",
                  border: active ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#a855f7" }} />}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          <form action={superAdminLogout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={{ color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sair do Super Admin
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 lg:h-screen lg:overflow-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-4" style={{ background: "rgba(15,15,23,0.8)", borderBottom: "1px solid rgba(139,92,246,0.1)", backdropFilter: "blur(12px)" }}>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(true)}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
              ◉ Super Admin
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
