"use client";

import { useState } from "react";
import type { CatalogProductDTO } from "./catalog-manager";

export function ProductDeleteDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: CatalogProductDTO;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setDeleting(true);

    try {
      const response = await fetch(`/api/productos/${product.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo eliminar el producto.");
        return;
      }
      onDeleted(data?.message ?? "Producto eliminado correctamente.");
    } catch {
      setError("Error de conexión con el servidor.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={() => !deleting && onClose()}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-[#FAF7F5] p-6 shadow-2xl"
      >
        <h3 className="text-lg font-extrabold text-slate-800">
          Eliminar producto
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          ¿Seguro que deseas eliminar{" "}
          <span className="font-extrabold text-slate-800">{product.name}</span>?
        </p>
        <p className="mt-2 rounded-xl bg-[#F3E6EB] px-3 py-2 text-xs font-semibold text-[#BE3663]">
          Si el producto ya tiene ventas o receta asociada, se desactivará para
          conservar reportes y tickets históricos. Si no tiene historial, se
          eliminará permanentemente.
        </p>

        {error && (
          <p className="mt-3 rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex-1 rounded-2xl bg-[#FDF8FC] py-3 font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-[2] rounded-2xl bg-[#BE3663] py-3 font-extrabold text-white shadow-lg transition enabled:hover:bg-[#9E2B57] disabled:opacity-40"
          >
            {deleting ? "Eliminando..." : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
