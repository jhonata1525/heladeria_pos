"use client";

import { useState } from "react";

interface TicketImpresionProps {
  negocioNombre: string;
  negocioDireccion: string;
  negocioTelefono: string;
  fechaHora: string;
  referenciaPedido: string | null;
  nombreCliente: string | null;
  cajero: string;
  items: Array<{ nombre: string; cantidad: number; precioUnitario: number; subtotal: number }>;
  total: number;
  metodoPago: string;
}

export function TicketImpresion({
  negocioNombre,
  negocioDireccion,
  negocioTelefono,
  fechaHora,
  referenciaPedido,
  nombreCliente,
  cajero,
  items,
  total,
  metodoPago,
}: TicketImpresionProps) {
  const [impreso, setImpreso] = useState(false);

  const handlePrint = () => {
    setImpreso(true);
    window.print();
    setImpreso(false);
  };

  return (
    <div
      className="print-page hidden print:block"
      style={{
        visibility: "visible",
        margin: 0,
        padding: 0,
      }}
    >
      <div style={{ width: "48mm", fontFamily: "monospace", fontSize: "10px", color: "#1F1B24" }}>
        <div style={{ textAlign: "center", marginBottom: "2mm", color: "#FF9CEE", fontWeight: "bold", fontSize: "11px" }}>
          {negocioNombre}
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", marginBottom: "1mm" }}>
          {negocioDireccion}
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", marginBottom: "2mm" }}>
          {negocioTelefono}
        </div>

        <div style={{ marginBottom: "2mm" }}>
          <div style={{ fontSize: "9px", marginBottom: "1px" }}>Fecha: {fechaHora}</div>
          <div style={{ fontSize: "9px", marginBottom: "1px" }}>
            Referencia: {referenciaPedido ?? "N/A"}
          </div>
          <div style={{ fontSize: "9px", marginBottom: "1px" }}>
            Cliente: {nombreCliente ?? "N/A"}
          </div>
          <div style={{ fontSize: "9px" }}>Cajero: {cajero}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm", fontSize: "8px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontWeight: "bold", paddingBottom: "1px", borderBottom: "1px solid #ddd" }}>Artículo</th>
              <th style={{ textAlign: "center", fontWeight: "bold", paddingBottom: "1px", borderBottom: "1px solid #ddd" }}>Cantidad</th>
              <th style={{ textAlign: "right", fontWeight: "bold", paddingBottom: "1px", borderBottom: "1px solid #ddd" }}>Precio</th>
              <th style={{ textAlign: "right", fontWeight: "bold", paddingBottom: "1px", borderBottom: "1px solid #ddd" }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #eee", padding: "1px 0" }}>
                <td style={{ textAlign: "left", padding: "0 1px" }}>{item.nombre}</td>
                <td style={{ textAlign: "center", padding: "0 1px" }}>{item.cantidad}</td>
                <td style={{ textAlign: "right", padding: "0 1px" }}>{item.precioUnitario}</td>
                <td style={{ textAlign: "right", padding: "0 1px" }}>{item.subtotal}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: "9px", marginTop: "1mm" }}>
          <div style={{ textAlign: "right" }}>Total: </div>
          <div style={{ textAlign: "right", fontWeight: "bold", fontSize: "10px" }}>{total}</div>
        </div>
        <div style={{ fontSize: "9px", marginTop: "1mm", textAlign: "right" }}>
          Método de pago: {metodoPago}
        </div>
      </div>
      <button
        onClick={handlePrint}
        style={{
          width: "48mm",
          margin: "2mm auto 0",
          display: "block",
          fontFamily: "monospace",
          fontSize: "10px",
          background: "#FF9CEE",
          color: "#2B1424",
          border: "none",
          padding: "3mm 0",
          cursor: "pointer",
        }}
        title="Imprimir Ticket"
      >
        🖨️ Imprimir
      </button>
    </div>
  );
}