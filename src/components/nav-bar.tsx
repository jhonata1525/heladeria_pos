"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

const links = [
  { href: "/pos", label: "Punto de Venta", icon: "🛒", roles: ["ADMIN", "CASHIER"] },
  { href: "/caja", label: "Caja", icon: "💵", roles: ["ADMIN", "CASHIER"] },
  { href: "/productos", label: "Productos", icon: "🍦", roles: ["ADMIN"] },
  { href: "/admin/pedidos", label: "Pedidos", icon: "📋", roles: ["ADMIN"] },
  { href: "/admin/reportes", label: "Reportes", icon: "📊", roles: ["ADMIN"] },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥", roles: ["ADMIN"] },
  { href: "/pedido", label: "Pedido Cliente", icon: "📱", roles: ["ADMIN"] },
  { href: "/ticket", label: "🧾 Ticket", icon: "🧾", roles: ["ADMIN"] },
];

export function NavBar({
  user,
}: {
  user: { name: string; role: string } | null;
}) {
  const pathname = usePathname();
  const visibleLinks = links.filter(
    (link) => !user || link.roles.includes(user.role),
  );

  return (
    <header className="sticky top-0 z-50 border-b border-[#FF9CEE] bg-[#FDF8FC]/90 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800"
        >
          <span className="text-2xl">🍨</span>
          <span>
            Heladitos <span className="text-[#C43E96]">Dani</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-1 rounded-full bg-[#E3F6FD] p-1 border border-[#FF9CEE]"
          >
            {visibleLinks.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition sm:px-4 ${
                    active
                      ? "bg-[#FF9CEE] text-[#2B1424] shadow font-bold"
                      : "text-slate-600 hover:bg-[#FDF8FC]/60 hover:text-slate-900"
                  }`}
                >
                  <span aria-hidden>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="flex items-center gap-2 rounded-full border border-[#FF9CEE] bg-[#FDF8FC] px-3 py-1.5 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E3F6FD] text-xs font-extrabold text-[#C43E96]">
                {user.role === "ADMIN" ? "👑" : "💵"}
              </span>
              <span className="max-w-[120px] truncate text-sm font-bold text-slate-700">
                {user.name}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                title="Cerrar sesión"
                className="rounded-full bg-[#FDF8FC] px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-[#FF9CEE] hover:text-[#2B1424]"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
