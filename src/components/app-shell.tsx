"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { NavBar } from "@/components/nav-bar";

const PUBLIC_AUTH_ROUTES = ["/login"];

function isPublicAuthRoute(pathname: string) {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; role: string } | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const hideNavBar = isPublicAuthRoute(pathname);

  return (
    <>
      {!hideNavBar && <NavBar user={user} />}
      <main
        className={
          hideNavBar
            ? "flex w-full flex-1"
            : "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6"
        }
      >
        {children}
      </main>
    </>
  );
}
