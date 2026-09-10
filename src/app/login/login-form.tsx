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
          className="mt-1 w-full rounded-xl border border-pink-100 bg-rose-50/40 px-4 py-2.5 text-slate-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
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
          className="mt-1 w-full rounded-xl border border-pink-100 bg-rose-50/40 px-4 py-2.5 text-slate-800 outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-pink-500 py-3 text-base font-extrabold text-white shadow-lg shadow-pink-200 transition enabled:hover:bg-pink-600 disabled:opacity-40"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
