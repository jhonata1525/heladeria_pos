import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth-server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Heladitos Dani",
  description: "Sistema de punto de venta, caja e inventario para heladerías",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col bg-[#85E3FF] text-[#1F1B24]">
        <AppShell user={user ? { name: user.name, role: user.role } : null}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
