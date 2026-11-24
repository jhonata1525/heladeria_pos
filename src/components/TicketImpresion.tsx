"use client";

import type { TicketConfigDTO } from "@/lib/types";

interface TicketImpresionProps {
  config: TicketConfigDTO;
  fechaHora: string;
  referenciaPedido: string | null;
  nombreCliente: string | null;
  cajero: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  total: number;
  metodoPago: string;
}

function formatoCOP(valor: number) {
  return `$ ${valor.toLocaleString("es-CO")}`;
}

export function TicketImpresion({
  config,
  fechaHora,
  referenciaPedido,
  nombreCliente,
  cajero,
  items,
  total,
  metodoPago,
}: TicketImpresionProps) {
  const handlePrint = () => {
    window.print();
  };

  const paperWidth = Number.isFinite(config.paperWidthMm) ? config.paperWidthMm : 58;
  const contentWidth = Math.max(paperWidth - 10, 40);
  const baseFont = Number.isFinite(config.fontSize) ? config.fontSize : 10;
  const smallFont = Math.max(baseFont - 1, 7);
  const titleFont = baseFont + 2;

  return (
    <>
      <style>{`
        @page {
          size: ${paperWidth}mm auto;
          margin: 0;
        }
        @media print {
          body * {
            visibility: hidden;
          }
          .ticket-termico-58mm,
          .ticket-termico-58mm * {
            visibility: visible;
          }
          .ticket-termico-58mm {
            position: absolute;
            left: 0;
            top: 0;
            width: ${contentWidth}mm !important;
            margin: 0 !important;
            padding: 2mm 1mm 18mm 1mm !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="ticket-termico-58mm hidden print:block"
        style={{
          width: `${contentWidth}mm`,
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: `${baseFont}px`,
          lineHeight: 1.25,
          color: "#000000",
        }}
      >
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: `${titleFont}px`, marginBottom: "1mm" }}>
          {config.businessName}
        </div>
        {config.nit && (
          <div style={{ textAlign: "center", fontSize: `${smallFont}px` }}>
            NIT: {config.nit}
          </div>
        )}
        {config.address && (
          <div style={{ textAlign: "center", fontSize: `${smallFont}px` }}>{config.address}</div>
        )}
        {config.phone && (
          <div style={{ textAlign: "center", fontSize: `${smallFont}px`, marginBottom: "2mm" }}>
            Tel: {config.phone}
          </div>
        )}

        <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "1.5mm 0", marginBottom: "2mm", fontSize: `${smallFont}px` }}>
          <div>Fecha: {fechaHora}</div>
          <div>Ref: {referenciaPedido ?? "N/A"}</div>
          <div>Cliente: {nombreCliente || "Mostrador"}</div>
          <div>Cajero: {cajero}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm", fontSize: `${smallFont}px` }}>
          <thead>
            <tr style={{ borderBottom: "1px dashed #000" }}>
              <th style={{ textAlign: "left", paddingBottom: "1mm" }}>Cant</th>
              <th style={{ textAlign: "left", paddingBottom: "1mm" }}>Producto</th>
              <th style={{ textAlign: "right", paddingBottom: "1mm" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td style={{ verticalAlign: "top", paddingTop: "1mm", paddingRight: "1mm" }}>
                  {item.cantidad}x
                </td>
                <td style={{ verticalAlign: "top", paddingTop: "1mm", paddingRight: "1mm" }}>
                  {item.nombre}
                  <div style={{ fontSize: `${smallFont - 1}px` }}>({formatoCOP(item.precioUnitario)} c/u)</div>
                </td>
                <td style={{ verticalAlign: "top", textAlign: "right", paddingTop: "1mm", whiteSpace: "nowrap" }}>
                  {formatoCOP(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed #000", paddingTop: "1.5mm", fontSize: `${baseFont + 1}px`, fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
          <span>TOTAL:</span>
          <span>{formatoCOP(total)}</span>
        </div>
        <div style={{ fontSize: `${smallFont}px`, marginTop: "1mm", textAlign: "right" }}>
          Pago: {metodoPago}
        </div>

        <div style={{ textAlign: "center", fontSize: `${smallFont}px`, marginTop: "3mm" }}>
          {config.footerMessage}
        </div>
      </div>

      <button
        type="button"
        onClick={handlePrint}
        className="no-print"
        style={{
          width: `${contentWidth}mm`,
          margin: "2mm auto 0",
          display: "block",
          fontFamily: "monospace",
          fontSize: "10px",
          fontWeight: "bold",
          background: "#FF9CEE",
          color: "#2B1424",
          border: "none",
          borderRadius: "8px",
          padding: "2.5mm 0",
          cursor: "pointer",
        }}
        title="Imprimir Ticket"
      >
        🖨️ Imprimir
      </button>
    </>
  );
}
