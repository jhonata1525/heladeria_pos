import { redirect } from "next/navigation";
import { getCurrentUser, ensureDefaultUsers } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión · Heladería POS" };

export default async function LoginPage() {
  await ensureDefaultUsers();

  const user = await getCurrentUser();
  if (user) redirect("/pos");

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-10">
      <div className="rounded-3xl border border-pink-100 bg-white p-8 shadow-lg">
        <p className="text-center text-5xl">🍨</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold text-slate-800">
          Heladería <span className="text-pink-500">POS</span>
        </h1>
        <p className="mb-6 mt-1 text-center text-sm text-slate-500">
          Ingresa con tu cuenta para continuar
        </p>
        <LoginForm />
      </div>
      <div className="mt-4 rounded-2xl bg-white/70 px-5 py-4 text-xs text-slate-500">
        <p className="font-bold text-slate-600">Cuentas de demostración:</p>
        <p className="mt-1">
          👑 Admin: <code className="font-mono">admin@heladeria.com</code> /{" "}
          <code className="font-mono">admin123</code>
        </p>
        <p>
          💵 Cajera: <code className="font-mono">cajera@heladeria.com</code> /{" "}
          <code className="font-mono">cajera123</code>
        </p>
      </div>
    </div>
  );
}
