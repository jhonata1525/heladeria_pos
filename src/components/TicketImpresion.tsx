"use client";

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

function formatoCOP(valor: number) {
  return `$ ${valor.toLocaleString("es-CO")}`;
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
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        @page {
          size: 58mm auto;
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
            width: 48mm !important;
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
          width: "48mm",
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "10px",
          lineHeight: 1.25,
          color: "#000000",
        }}
      >
        <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12px", marginBottom: "1mm" }}>
          {negocioNombre}
        </div>
        {negocioDireccion && (
          <div style={{ textAlign: "center", fontSize: "9px" }}>{negocioDireccion}</div>
        )}
        {negocioTelefono && (
          <div style={{ textAlign: "center", fontSize: "9px", marginBottom: "2mm" }}>
            Tel: {negocioTelefono}
          </div>
        )}

        <div style={{ borderTop: "1px dashed #000", borderBottom: "1px dashed #000", padding: "1.5mm 0", marginBottom: "2mm", fontSize: "9px" }}>
          <div>Fecha: {fechaHora}</div>
          <div>Ref: {referenciaPedido ?? "N/A"}</div>
          <div>Cliente: {nombreCliente || "Mostrador"}</div>
          <div>Cajero: {cajero}</div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2mm", fontSize: "9px" }}>
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
                  <div style={{ fontSize: "8px" }}>({formatoCOP(item.precioUnitario)} c/u)</div>
                </td>
                <td style={{ verticalAlign: "top", textAlign: "right", paddingTop: "1mm", whiteSpace: "nowrap" }}>
                  {formatoCOP(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ borderTop: "1px dashed #000", paddingTop: "1.5mm", fontSize: "11px", fontWeight: "bold", display: "flex", justifyContent: "space-between" }}>
          <span>TOTAL:</span>
          <span>{formatoCOP(total)}</span>
        </div>
        <div style={{ fontSize: "9px", marginTop: "1mm", textAlign: "right" }}>
          Pago: {metodoPago}
        </div>

        <div style={{ textAlign: "center", fontSize: "9px", marginTop: "3mm" }}>
          ¡Gracias por su compra!
        </div>
      </div>

      <button
        type="button"
        onClick={handlePrint}
        className="no-print"
        style={{
          width: "48mm",
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