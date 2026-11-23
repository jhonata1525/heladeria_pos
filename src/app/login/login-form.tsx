"use client";

import { useState } from "react";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    try {
      const result = await login(null, formData);
      if (result && !result.ok) {
        setError(result.error ?? "No se pudo iniciar sesión.");
      }
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <label className="block text-sm font-semibold text-slate-600">
        Correo
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="tu@heladeria.com"
          className="mt-1 w-full rounded-xl border border-[#FF9CEE] bg-[#FDF8FC] px-4 py-2.5 text-slate-800 outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
        />
      </label>
      <label className="block text-sm font-semibold text-slate-600">
        Contraseña
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-xl border border-[#FF9CEE] bg-[#FDF8FC] px-4 py-2.5 text-slate-800 outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[#FF9CEE] py-3 text-base font-extrabold text-[#2B1424] shadow-md transition enabled:hover:bg-[#F282DF] disabled:opacity-40"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}