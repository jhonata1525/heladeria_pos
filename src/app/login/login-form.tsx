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
          className="mt-1 w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-bg-[#F3E6EB]/40 px-4 py-2.5 text-slate-800 outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
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
          className="mt-1 w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-bg-[#F3E6EB]/40 px-4 py-2.5 text-slate-800 outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-text-[#BE3663]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-bg-[#D64575] py-3 text-base font-extrabold text-white shadow-lg shadow-border-[#E4C7D2] transition enabled:hover:bg-text-[#D64575] disabled:opacity-40"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
