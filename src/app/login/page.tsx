import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión · Heladitos Dani" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/pos");

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-[#FF9CEE]/70 bg-[#FAF7F5] p-8 shadow-xl ring-1 ring-[#DFF2EE]">
        <p className="text-center text-6xl" aria-hidden>
          🍨
        </p>
        <h1 className="mt-3 text-center text-4xl font-extrabold tracking-tight text-slate-800">
          Heladitos <span className="text-[#D64575]">Dani</span>
        </h1>
        <p className="mb-7 mt-2 text-center text-sm text-slate-500">
          Ingresa con tu cuenta para continuar
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
