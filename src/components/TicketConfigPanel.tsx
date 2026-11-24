"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TicketImpresion } from "@/components/TicketImpresion";
import type { TicketConfigDTO } from "@/lib/types";

const inputClass =
  "w-full rounded-lg border border-[#E4C7D2] bg-[#FAF7F5] px-3 py-2.5 text-sm text-[#1F7A68] outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-[#E4C7D2]";

export function TicketConfigPanel({
  initialConfig,
}: {
  initialConfig: TicketConfigDTO;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<TicketConfigDTO>(initialConfig);
  const [printPreview, setPrintPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]:
        name === "fontSize" || name === "paperWidthMm" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload: TicketConfigDTO = {
      ...config,
      businessName: config.businessName.trim(),
      phone: config.phone.trim(),
      footerMessage: config.footerMessage.trim(),
      nit: config.nit?.trim() || null,
      address: config.address?.trim() || null,
    };

    try {
      const res = await fetch("/api/ticket-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setFeedback(data?.error ?? "No se pudo guardar la configuración");
        return;
      }
      if (data.config) {
        setConfig(data.config as TicketConfigDTO);
      }
      setFeedback("✅ Configuración guardada");
      router.refresh();
    } catch {
      setFeedback("Error de conexión con el servidor");
    } finally {
      setSaving(false);
    }
  };

  const handlePrintPreview = () => {
    setPrintPreview(true);
    setTimeout(() => setPrintPreview(false), 300);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">🧾 Configurar Ticket</h2>

      <form onSubmit={handleSubmit} className="grid gap-4 pb-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Nombre del Negocio
            <span className="text-[#BE3663]">*</span>
          </label>
          <input
            name="businessName"
            type="text"
            value={config.businessName}
            onChange={handleInputChange}
            placeholder="Heladería POS"
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              NIT/RUC
            </label>
            <input
              name="nit"
              type="text"
              value={config.nit ?? ""}
              onChange={handleInputChange}
              placeholder="900123456-7"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Dirección
            </label>
            <input
              name="address"
              type="text"
              value={config.address ?? ""}
              onChange={handleInputChange}
              placeholder="Calle Principal #123"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Teléfono
          </label>
          <input
            name="phone"
            type="text"
            value={config.phone}
            onChange={handleInputChange}
            placeholder="312 345 6789"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Mensaje de Pie
          </label>
          <input
            name="footerMessage"
            type="text"
            value={config.footerMessage}
            onChange={handleInputChange}
            placeholder="¡Gracias por su compra!"
            className={inputClass}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Tamaño de Fuente
            </label>
            <input
              name="fontSize"
              type="number"
              value={config.fontSize}
              onChange={handleInputChange}
              min="8"
              max="14"
              className={inputClass}
              required
            />
            <span className="text-xs text-slate-500">8-14 px</span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Ancho de Papel (mm)
            </label>
            <input
              name="paperWidthMm"
              type="number"
              value={config.paperWidthMm}
              onChange={handleInputChange}
              min="54"
              max="80"
              className={inputClass}
              required
            />
            <span className="text-xs text-slate-500">54-80 mm</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setConfig(initialConfig);
              setFeedback(null);
            }}
            className="flex-1 rounded-2xl bg-[#FDF8FC] py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-2xl bg-[#FF9CEE] py-2.5 font-bold text-[#2B1424] transition hover:bg-[#F282DF] disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar Configuración"}
          </button>
        </div>

        {feedback && (
          <p
            className={`text-sm font-semibold ${
              feedback.startsWith("✅") ? "text-[#1F7A68]" : "text-[#BE3663]"
            }`}
          >
            {feedback}
          </p>
        )}
      </form>

      <div>
        <button
          type="button"
          onClick={handlePrintPreview}
          className="rounded-full bg-[#85E3FF] px-4 py-2 text-sm font-bold text-[#1F1B24] transition hover:bg-[#6FD3F2]"
        >
          👁️ Ver vista previa de impresión
        </button>
      </div>

      {printPreview && (
        <div className="mt-6">
          <h3 className="text-base font-bold text-slate-800">👁️ Vista Previa de Impresión</h3>
          <TicketImpresion
            config={config}
            fechaHora={new Date().toLocaleString("es-CO")}
            referenciaPedido="# PEDIDO"
            nombreCliente=""
            cajero="Cajero Actual"
            items={[
              { nombre: "Helado V.", cantidad: 2, precioUnitario: 5000, subtotal: 10000 },
              { nombre: "Cono V.", cantidad: 1, precioUnitario: 3000, subtotal: 3000 },
            ]}
            total={13000}
            metodoPago="Efectivo"
          />
          <p className="mt-2 text-sm text-slate-500">Haz clic en &quot;Imprimir&quot; para ver la tirilla.</p>
          <button
            onClick={() => setPrintPreview(false)}
            className="mt-2 rounded-full bg-[#FF9CEE] px-3 py-1.5 text-xs font-bold text-[#2B1424] transition hover:bg-[#F282DF]"
            title="Cerrar vista previa"
          >
            ✕ Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
