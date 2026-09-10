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
    <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/85 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/pos"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800"
        >
          <span className="text-2xl">🍨</span>
          <span>
            Heladería <span className="text-pink-500">POS</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <nav
            aria-label="Navegación principal"
            className="flex items-center gap-1 rounded-full bg-pink-50 p-1"
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
                      ? "bg-white text-pink-600 shadow"
                      : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
                  }`}
                >
                  <span aria-hidden>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {user && (
            <div className="flex items-center gap-2 rounded-full border border-pink-100 bg-white px-3 py-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-xs font-extrabold text-pink-600">
                {user.role === "ADMIN" ? "👑" : "💵"}
              </span>
              <span className="max-w-[120px] truncate text-sm font-bold text-slate-600">
                {user.name}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                title="Cerrar sesión"
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-500"
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
