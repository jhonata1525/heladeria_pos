"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  entity: string;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: { name: string; email: string };
}

export function UsuariosClient({ users, auditLogs }: { users: User[]; auditLogs: AuditLog[] }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "CASHIER", isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  function resetForm() {
    setFormData({ name: "", email: "", password: "", role: "CASHIER", isActive: true });
    setEditingUser(null);
    setError(null);
  }

  function openCreateModal() {
    resetForm();
    setShowCreateModal(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role, isActive: user.isActive });
    setShowCreateModal(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      
      const body = { ...formData };
      if (!editingUser && !body.password) {
        setError("La contraseña es obligatoria para nuevos usuarios");
        setSubmitting(false);
        return;
      }
      if (editingUser && !body.password) {
        const { password, ...rest } = body;
        Object.assign(body, rest);
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "Error al guardar usuario");
        return;
      }

      resetForm();
      setShowCreateModal(false);
      window.location.reload();
    } catch {
      setError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: User) {
    if (!window.confirm(`${user.isActive ? "Desactivar" : "Activar"} al usuario ${user.name}?`)) return;
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (!response.ok) throw new Error("Error");
      window.location.reload();
    } catch {
      alert("Error al actualizar usuario");
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Nunca";
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(dateStr));
  }

  function getRoleBadge(role: string) {
    return role === "ADMIN" 
      ? "bg-pink-100 text-pink-700" 
      : "bg-emerald-100 text-emerald-700";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            {activeTab === "users" ? "👥 Gestión de Usuarios" : "📋 Auditoría"}
          </h1>
          <p className="text-sm text-slate-500">
            {activeTab === "users" 
              ? "Administra empleados y sus permisos" 
              : "Historial de acciones importantes del sistema"}
          </p>
        </div>
        {activeTab === "users" && (
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-full bg-pink-500 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-pink-600"
          >
            + Nuevo empleado
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "users" ? "bg-pink-500 text-white shadow" : "bg-white text-slate-600 shadow-sm hover:bg-pink-50"
          }`}
        >
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === "audit" ? "bg-pink-500 text-white shadow" : "bg-white text-slate-600 shadow-sm hover:bg-pink-50"
          }`}
        >
          Auditoría
        </button>
      </div>

      {activeTab === "users" && (
        <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
          {users.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No hay usuarios registrados</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pink-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-bold">Usuario</th>
                  <th className="px-5 py-2.5 font-bold">Rol</th>
                  <th className="px-5 py-2.5 font-bold">Estado</th>
                  <th className="px-5 py-2.5 font-bold">Último acceso</th>
                  <th className="px-5 py-2.5 font-bold">Intentos fallidos</th>
                  <th className="px-5 py-2.5 font-bold">Creado</th>
                  <th className="px-5 py-2.5 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {users.map((user) => (
                  <tr key={user.id} className={!user.isActive ? "opacity-50 bg-slate-50" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-bold text-slate-700">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {user.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-5 py-3">
                      <span className={user.failedLoginAttempts > 0 ? "text-rose-600 font-bold" : "text-slate-500"}>
                        {user.failedLoginAttempts} / 5
                      </span>
                      {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                        <span className="ml-1 text-xs text-rose-600 font-bold">🔒 Bloqueado</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(user)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                            user.isActive 
                              ? "bg-rose-100 text-rose-600 hover:bg-rose-200" 
                              : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                          }`}
                        >
                          {user.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
          {auditLogs.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No hay registros de auditoría</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-pink-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5 font-bold">Fecha</th>
                  <th className="px-5 py-2.5 font-bold">Usuario</th>
                  <th className="px-5 py-2.5 font-bold">Acción</th>
                  <th className="px-5 py-2.5 font-bold">Entidad</th>
                  <th className="px-5 py-2.5 font-bold">Detalles</th>
                  <th className="px-5 py-2.5 font-bold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-5 py-2.5 text-slate-700">
                      {log.user?.name ?? "Sistema"} ({log.user?.email ?? "N/A"})
                    </td>
                    <td className="px-5 py-2.5">
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{log.entity}</td>
                    <td className="px-5 py-2.5 text-slate-500 max-w-xs truncate">
                      {log.details ? JSON.parse(log.details) : "—"}
                    </td>
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-xl font-extrabold text-slate-800">
              {editingUser ? "Editar empleado" : "Nuevo empleado"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">{error}</p>}
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Correo</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Contraseña {editingUser ? "(dejar vacío para no cambiar)" : ""}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editingUser}
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                >
                  <option value="CASHIER">Cajero/a</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-pink-300 text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-600">Usuario activo</label>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-[2] rounded-2xl bg-pink-500 py-3 font-extrabold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:opacity-40"
                  disabled={submitting}
                >
                  {submitting ? "Guardando…" : editingUser ? "Actualizar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}