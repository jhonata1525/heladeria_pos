import { formatMoney, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Gestión de Pedidos · Heladería POS" };

export default async function PedidosPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-800">📋 Gestión de Pedidos</h1>
        <p className="text-sm text-slate-500">
          Últimos 100 pedidos. Solo se pueden eliminar pedidos PENDIENTES o CANCELADOS.
        </p>
      </header>

      <section className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-400">No hay pedidos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-pink-50/60 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-bold">#</th>
                <th className="px-5 py-2.5 font-bold">Fecha</th>
                <th className="px-5 py-2.5 font-bold">Cliente</th>
                <th className="px-5 py-2.5 font-bold">Mesa</th>
                <th className="px-5 py-2.5 font-bold">Productos</th>
                <th className="px-5 py-2.5 text-right font-bold">Total</th>
                <th className="px-5 py-2.5 font-bold">Estado</th>
                <th className="px-5 py-2.5 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-50">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-3 font-mono text-slate-500">{order.orderNumber}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(order.createdAt)}</td>
                  <td className="px-5 py-3 font-medium text-slate-700">
                    {order.customerName ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {order.tableNumber ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {order.items.map((i) => i.product.name).join(", ")}
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold text-pink-600">
                    {formatMoney(order.total)}
                  </td>
                  <td className="px-5 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-5 py-3">
                    <DeleteOrderButton
                      orderId={order.id}
                      orderNumber={order.orderNumber}
                      status={order.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    PENDING: { label: "⏳ Pendiente", class: "bg-amber-50 text-amber-600" },
    PAID: { label: "✅ Pagado", class: "bg-emerald-50 text-emerald-600" },
    CANCELLED: { label: "❌ Cancelado", class: "bg-rose-50 text-rose-600" },
  };
  const c = config[status] ?? { label: status, class: "bg-slate-50 text-slate-600" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${c.class}`}>
      {c.label}
    </span>
  );
}

function DeleteOrderButton({
  orderId,
  orderNumber,
  status,
}: {
  orderId: number;
  orderNumber: number;
  status: string;
}) {
  const canDelete = status === "PENDING" || status === "CANCELLED";

  if (!canDelete) {
    return <span className="text-xs text-slate-400">No eliminable</span>;
  }

  return (
    <form action={`/api/admin/orders/${orderId}/delete`} method="POST">
      <button
        type="submit"
        className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
        onClick={(e) => {
          if (!confirm(`¿Eliminar pedido #${orderNumber}? Esta acción no se puede deshacer.`)) {
            e.preventDefault();
          }
        }}
      >
        🗑 Eliminar
      </button>
    </form>
  );
}