"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatMoney, round2 } from "@/lib/format";
import type {
  CartLine,
  CategoryDTO,
  PaymentMethod,
  PendingOrderDTO,
  ProductDTO,
} from "@/lib/types";

const QUICK_CASH = [5000, 10000, 20000, 50000];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "CASH", label: "Efectivo", icon: "💵" },
  { value: "TRANSFER", label: "Nequi / Transferencia", icon: "📱" },
  { value: "CARD", label: "Tarjeta", icon: "💳" },
];

type CheckoutResult = {
  orderNumber: number;
  total: number;
  changeGiven: number | null;
};

type SSEOrder = {
  id: number;
  orderNumber: number;
  customerName: string | null;
  tableNumber: number | null;
  total: number;
  status: string;
  changeGiven: number | null;
  createdAt: string;
};

type SSEOrderCancelled = {
  id: number;
  orderNumber: number;
};

type SSEOrderUpdated = {
  id: number;
  orderNumber: number;
  status: string;
  paymentMethod?: string;
};

export function PosClient({
  categories,
  pendingOrders,
  hasOpenRegister,
  userRole,
}: {
  categories: CategoryDTO[];
  pendingOrders: PendingOrderDTO[];
  hasOpenRegister: boolean;
  userRole: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>("CASH");
  const [cashInput, setCashInput] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [livePendingOrders, setLivePendingOrders] = useState<PendingOrderDTO[]>(pendingOrders);
  const [liveHasOpenRegister, setLiveHasOpenRegister] = useState(hasOpenRegister);

  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/sse");
    eventSourceRef.current = es;

    es.addEventListener("order:created", (event) => {
      try {
        const order = JSON.parse(event.data) as SSEOrder;
        setLivePendingOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          return [
            ...prev,
            {
              id: order.id,
              orderNumber: order.orderNumber,
              customerName: order.customerName,
              tableNumber: order.tableNumber,
              total: order.total,
              status: order.status,
              createdAt: order.createdAt,
              items: [],
            },
          ];
        });
      } catch (e) {
        console.error("Failed to parse order:created", e);
      }
    });

    es.addEventListener("order:updated", (event) => {
      try {
        const update = JSON.parse(event.data) as SSEOrderUpdated;
        setLivePendingOrders((prev) =>
          prev.filter((o) => o.id !== update.id)
        );
      } catch (e) {
        console.error("Failed to parse order:updated", e);
      }
    });

    es.addEventListener("order:cancelled", (event) => {
      try {
        const update = JSON.parse(event.data) as SSEOrderCancelled;
        setLivePendingOrders((prev) => prev.filter((o) => o.id !== update.id));
      } catch (e) {
        console.error("Failed to parse order:cancelled", e);
      }
    });

    es.addEventListener("stock:updated", () => {
      router.refresh();
    });

    es.addEventListener("register:opened", () => {
      setLiveHasOpenRegister(true);
    });

    es.addEventListener("register:closed", () => {
      setLiveHasOpenRegister(false);
    });

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (eventSourceRef.current === es) {
          const newEs = new EventSource("/api/sse");
          eventSourceRef.current = newEs;
        }
      }, 5000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [router]);

  const allProducts = useMemo(
    () => categories.flatMap((category) => category.products),
    [categories],
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === null || product.categoryId === selectedCategory;
      const matchesSearch =
        term.length === 0 || product.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [allProducts, search, selectedCategory]);

  const lines = Object.values(cart);
  const subtotal = round2(
    lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const received = Number(cashInput.replace(",", "."));
  const change =
    payMethod === "CASH" && Number.isFinite(received)
      ? round2(received - subtotal)
      : null;

  function addProduct(product: ProductDTO) {
    setError(null);
    setCart((prev) => {
      const line = prev[product.id];
      const nextQty = round2(Math.min((line?.quantity ?? 0) + 1, product.stockQuantity));
      if (!line && product.stockQuantity <= 0) return prev;
      if (line && nextQty === line.quantity) return prev;
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: nextQty,
          notes: line?.notes ?? "",
        },
      };
    });
  }

  function setQuantity(productId: number, quantity: number) {
    setCart((prev) => {
      const line = prev[productId];
      if (!line) return prev;
      if (quantity <= 0) {
        const rest = { ...prev };
        delete rest[productId];
        return rest;
      }
      return {
        ...prev,
        [productId]: {
          ...line,
          quantity: round2(Math.min(quantity, line.product.stockQuantity)),
        },
      };
    });
  }

  function setNotes(productId: number, notes: string) {
    setCart((prev) =>
      prev[productId]
        ? { ...prev, [productId]: { ...prev[productId], notes } }
        : prev,
    );
  }

  function clearCart() {
    setCart({});
    setEditingOrderId(null);
  }

  function openCheckout() {
    setError(null);
    setResult(null);
    setPayMethod("CASH");
    setCashInput("");
    setCustomerName("");
    setTableNumber("");
    setCheckoutOpen(true);
  }

  async function submitOrder(status: "PENDING" | "PAID") {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      let response: Response;
      if (status === "PAID" && editingOrderId !== null) {
        response = await fetch(`/api/orders/${editingOrderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "pay",
            paymentMethod: payMethod,
            ...(payMethod === "CASH" ? { cashReceived: received } : {}),
            referenceNumber: payMethod !== "CASH" ? referenceNumber : undefined,
          }),
        });
      } else {
        response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            customerName: customerName.trim() || null,
            tableNumber: tableNumber.trim() ? Number(tableNumber) : null,
            ...(status === "PAID"
              ? { paymentMethod: payMethod, cashReceived: received, referenceNumber: payMethod !== "CASH" ? referenceNumber : undefined }
              : {}),
            items: lines.map((line) => ({
              productId: line.product.id,
              quantity: line.quantity,
              notes: line.notes.trim() || null,
            })),
          }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo guardar el pedido");
        return;
      }

      const orderNumber = data?.order?.orderNumber ?? data?.order?.id ?? 0;
      setResult({
        orderNumber,
        total: subtotal,
        changeGiven: status === "PAID" && payMethod === "CASH" ? change : null,
      });
      clearCart();
      setCheckoutOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadPendingOrder(order: PendingOrderDTO) {
    setError(null);
    if (lines.length > 0 && !window.confirm("Tu comanda actual se reemplazará. ¿Continuar?")) {
      return;
    }

    const next: Record<number, CartLine> = {};
    for (const item of order.items) {
      const product = allProducts.find((p) => p.id === item.productId);
      if (!product) continue;
      next[item.productId] = {
        product,
        quantity: item.quantity,
        notes: item.notes ?? "",
      };
    }
    setCart(next);
    setEditingOrderId(order.id);
    setCustomerName(order.customerName ?? "");
    setTableNumber(order.tableNumber?.toString() ?? "");
    openCheckout();
  }

  async function cancelPendingOrder(order: PendingOrderDTO) {
    if (!window.confirm(`¿Cancelar el pedido #${order.orderNumber}? El stock volverá al inventario.`)) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo cancelar el pedido");
        return;
      }
      if (editingOrderId === order.id) clearCart();
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section>
        <div className="mb-4 space-y-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto… 🍦"
            className="w-full rounded-full border-[1.5px] border-[#FF9CEE] bg-[#FDF8FC] px-5 py-3 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === null
                  ? "bg-[#FF9CEE] text-[#2B1424] shadow font-bold"
                  : "bg-[#FDF8FC] text-slate-700 shadow-sm border border-[#FF9CEE] hover:bg-[#FF9CEE]/30"
              }`}
            >
              Todos
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === category.id
                    ? "bg-[#FF9CEE] text-[#2B1424] shadow font-bold"
                    : "bg-[#FDF8FC] text-slate-700 shadow-sm border border-[#FF9CEE] hover:bg-[#FF9CEE]/30"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {livePendingOrders.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-2 text-sm font-bold text-amber-700">
              ⏳ Pedidos en cola ({livePendingOrders.length})
            </h2>
            <ul className="space-y-2">
              {livePendingOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF7F5] px-3 py-2 shadow-sm"
                >
                  <div className="text-sm">
                    <span className="font-bold text-slate-700">
                      #{order.orderNumber}
                    </span>{" "}
                    {order.customerName && (
                      <span className="text-slate-500"> · {order.customerName}</span>
                    )}
                    {order.tableNumber && (
                      <span className="text-slate-500"> · Mesa {order.tableNumber}</span>
                    )}
                    <span className="text-slate-500">
                      · {order.items.length} productos · {formatMoney(order.total)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => loadPendingOrder(order)}
                      className="rounded-full bg-bg-[#D64575] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-text-[#D64575]"
                    >
                      Cobrar
                    </button>
                    {userRole === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => cancelPendingOrder(order)}
                        className="rounded-full bg-bg-[#DFF2EE] text-[#1F7A68] px-3 py-1.5 text-xs font-bold text-text-[#BE3663] transition hover:bg-border-[#E4C7D2]"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!liveHasOpenRegister && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            <span>
              🔒 No hay un turno de caja abierto. Puedes dejar pedidos pendientes,
              pero no cobrar.
            </span>
            <Link
              href="/caja"
              className="rounded-full bg-amber-400 px-3 py-1.5 font-bold text-white transition hover:bg-amber-500"
            >
              Abrir caja
            </Link>
          </div>
        )}

        {error && !checkoutOpen && (
          <p className="mb-4 rounded-xl bg-bg-[#F3E6EB] px-4 py-3 text-sm font-semibold text-text-[#BE3663]">
            {error}
          </p>
        )}

        {visibleProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-[#E4C7D2] bg-[#FAF7F5]/70 p-12 text-center">
            <p className="text-4xl">🍦</p>
            <p className="mt-2 font-semibold text-slate-500">
              No hay productos que coincidan.
            </p>
            <Link href="/productos" className="mt-1 inline-block text-sm font-semibold text-bg-[#D64575] underline">
              Revisa el catálogo en Productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const soldOut = !product.inStock || product.stockQuantity <= 0;
              const inCart = cart[product.id]?.quantity ?? 0;
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => addProduct(product)}
                  className={`relative flex min-h-[110px] flex-col justify-between rounded-2xl border-[1.5px] border-[#FF9CEE] p-3 text-left shadow-sm transition ${
                    soldOut
                      ? "cursor-not-allowed bg-[#FDF8FC] opacity-60"
                      : "bg-[#FDF8FC] hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                  } ${inCart > 0 ? "ring-2 ring-[#FF9CEE]" : ""}`}
                >
                  {inCart > 0 && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF9CEE] text-xs font-bold text-[#2B1424]">
                      {inCart}
                    </span>
                  )}
                  <span className="pr-6 text-sm font-bold leading-snug text-[#1F1B24]">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        className="mb-1.5 h-10 w-10 rounded-lg object-cover"
                      />
                    ) : null}
                    {product.name}
                  </span>
                  <span className="mt-2 flex items-end justify-between gap-1">
                    <span className="text-base font-extrabold text-[#C43E96]">
                      {formatMoney(product.price)}
                    </span>
                    <span
                      className={`text-[12px] font-bold text-[#C43E96] ${
                        soldOut ? "text-rose-400" : ""
                      }`}
                    >
                      {soldOut
                        ? "Agotado"
                        : `${product.stockQuantity} ${product.unit}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside className="lg:sticky lg:top-[84px] lg:self-start">
        <div className="flex max-h-[calc(100vh-108px)] flex-col rounded-3xl border-[1.5px] border-[#FF9CEE] bg-[#FDF8FC] shadow-lg">
          <div className="border-b border-[#FF9CEE] px-5 py-4">
            <h2 className="flex items-center justify-between text-lg font-extrabold text-slate-800">
              🧾 Comanda activa
              {editingOrderId !== null && (
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                  Pagando pedido pendiente
                </span>
              )}
            </h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Toca un producto para agregarlo a la comanda.
              </p>
            ) : (
              lines.map((line) => (
                <div
                  key={line.product.id}
                  className="rounded-2xl border border-[#FF9CEE]/40 bg-[#FDF8FC] p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-slate-700">
                      {line.product.name}
                    </p>
                    <button
                      type="button"
                      aria-label={`Quitar ${line.product.name}`}
                      onClick={() => setQuantity(line.product.id, 0)}
                      className="text-slate-400 transition hover:text-[#C43E96]"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Disminuir cantidad"
                        onClick={() => setQuantity(line.product.id, round2(line.quantity - 1))}
                        className="h-9 w-9 rounded-full bg-[#FDF8FC] border border-[#FF9CEE] text-lg font-bold text-[#C43E96] shadow-sm transition hover:bg-[#FF9CEE]/20"
                      >
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-extrabold text-slate-800">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Aumentar cantidad"
                        onClick={() => addProduct(line.product)}
                        className="h-9 w-9 rounded-full bg-[#FDF8FC] border border-[#FF9CEE] text-lg font-bold text-[#C43E96] shadow-sm transition hover:bg-[#FF9CEE]/20"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-extrabold text-[#C43E96]">
                      {formatMoney(line.product.price * line.quantity)}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={line.notes}
                    onChange={(event) => setNotes(line.product.id, event.target.value)}
                    placeholder="Nota (ej: sin salsa, doble topping)"
                    className="mt-2 w-full rounded-lg border border-[#FF9CEE] bg-[#FDF8FC] px-2.5 py-1.5 text-xs outline-none placeholder:text-slate-400 focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
                  />
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 border-t border-[#FF9CEE] px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-semibold text-slate-700">
                Nombre del cliente
                <span className="text-[#C43E96]">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                className="rounded-lg border border-[#FF9CEE] bg-[#FDF8FC] px-3 py-2 text-sm outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
                minLength={1}
              />
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal ({itemCount} art.)</span>
              <span className="font-semibold">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold text-slate-800">
              <span>Total</span>
              <span className="text-text-[#D64575]">{formatMoney(subtotal)}</span>
            </div>

            <button
              type="button"
              disabled={lines.length === 0 || submitting}
              onClick={() => submitOrder("PENDING")}
              className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-700 transition enabled:hover:bg-amber-100 disabled:opacity-40"
            >
              ⏳ Dejar pendiente / Enviar a cola
            </button>
            <button
              type="button"
              disabled={lines.length === 0 || submitting || !liveHasOpenRegister}
              onClick={openCheckout}
              title={
                liveHasOpenRegister
                  ? undefined
                  : "Abre un turno de caja para poder cobrar"
              }
              className={`w-full rounded-2xl py-4 text-lg font-extrabold shadow-md transition ${
                lines.length === 0 || submitting || !liveHasOpenRegister
                  ? "bg-[#E8DCE5] text-[#756270] cursor-not-allowed opacity-70"
                  : "bg-[#FF9CEE] text-[#2B1424] hover:bg-[#F282DF]"
              }`}
            >
              💳 Cobrar {subtotal > 0 ? formatMoney(subtotal) : ""}
            </button>
          </div>
        </div>
      </aside>

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => !submitting && setCheckoutOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-[#FAF7F5] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-1 text-xl font-extrabold text-slate-800">
              Cobrar comanda
            </h3>
            <p className="mb-4 text-sm text-slate-500">
              Total a cobrar:{" "}
              <span className="font-extrabold text-text-[#D64575]">
                {formatMoney(subtotal)}
              </span>
            </p>

            {lines.length > 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 p-3 mb-4">
                <h4 className="text-sm font-bold text-amber-800 mb-3">Productos de la comanda</h4>
                <div className="space-y-2 text-sm">
                  {lines.map((line) => (
                    <div key={line.product.id} className="flex justify-between items-center py-1">
                      <span>
                        {line.product.name}{" "}{line.quantity > 1 && (
                          <span className="text-bg-[#D64575]">×{line.quantity}</span>
                        )}
                      </span>
                      {line.notes && (
                        <span className="text-emerald-400 text-xs italic">({line.notes})</span>
                      )}
                      <span className="font-medium">{formatMoney(line.product.price * line.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Nombre del cliente (opcional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">
                  Número de mesa (opcional)
                </label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ej: 5"
                  min="1"
                  className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPayMethod(option.value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 text-xs font-bold transition ${
                    payMethod === option.value
                      ? "border-emerald-400 bg-bg-[#F3E6EB] text-text-[#D64575]"
                      : "border-slate-100 text-slate-500 hover:border-border-[#E4C7D2]"
                  }`}
                >
                  <span className="text-xl">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>

            {payMethod !== "CASH" && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-semibold text-slate-600">
                  Número de comprobante / Referencia
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ej: TRX123456 o últimos 4 dígitos"
                    className="w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
                  />
                </label>
              </div>
            )}

            {payMethod === "CASH" && (
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-semibold text-slate-600">
                  Efectivo recibido
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={cashInput}
                    onChange={(event) => setCashInput(event.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-bg-[#DFF2EE] text-[#1F7A68] bg-bg-[#F3E6EB]/50 px-4 py-3 text-2xl font-extrabold text-slate-800 outline-none focus:border-[#D5CECA] focus:ring-2 focus:ring-border-[#E4C7D2]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashInput(String(subtotal))}
                    className="rounded-full bg-bg-[#DFF2EE] text-[#1F7A68] px-3 py-1.5 text-xs font-bold text-text-[#D64575] hover:bg-border-[#E4C7D2]"
                  >
                    Exacto
                  </button>
                  {QUICK_CASH.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashInput(String(amount))}
                      className="rounded-full bg-[#FDF8FC] px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
                    >
                      {formatMoney(amount)}
                    </button>
                  ))}
                </div>
                <div
                  className={`rounded-xl px-4 py-3 text-center text-lg font-extrabold ${
                    change === null
                      ? "bg-[#FDF8FC] text-slate-400"
                      : change < 0
                        ? "bg-bg-[#F3E6EB] text-text-[#D64575]"
                        : "bg-bg-[#F3E6EB] text-text-[#D64575]"
                  }`}
                >
                  {change === null
                    ? "Ingresa el efectivo recibido"
                    : change < 0
                      ? `Faltan ${formatMoney(-change)}`
                      : `Cambio: ${formatMoney(change)} 🪙`}
                </div>
              </div>
            )}

            {error && (
              <p className="mb-3 rounded-xl bg-bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-text-[#BE3663]">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 rounded-2xl bg-[#FDF8FC] py-3 font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={
                  submitting ||
                  (payMethod === "CASH" &&
                    (!Number.isFinite(received) || received < subtotal))
                }
                onClick={() => submitOrder("PAID")}
                className="flex-[2] rounded-2xl bg-bg-[#D64575] py-3 font-extrabold text-white shadow-lg shadow-bg-[#DFF2EE] text-[#1F7A68] transition enabled:hover:bg-text-[#D64575] disabled:opacity-40"
              >
                {submitting ? "Procesando…" : "Confirmar pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#FAF7F5] p-8 text-center shadow-2xl">
            <p className="text-5xl">🎉</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-800">
              ¡Pedido registrado!
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Pedido <span className="font-bold">#{result.orderNumber}</span> por{" "}
              {formatMoney(result.total)}
            </p>
            {result.changeGiven !== null && result.changeGiven >= 0 && (
              <div className="mt-4 rounded-2xl bg-bg-[#F3E6EB] px-4 py-4 text-text-[#D64575]">
                <p className="text-xs font-bold uppercase tracking-wide">
                  Cambio a entregar
                </p>
                <p className="text-3xl font-extrabold">
                  {formatMoney(result.changeGiven)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-6 w-full rounded-2xl bg-bg-[#D64575] py-3 font-extrabold text-white transition hover:bg-text-[#D64575]"
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
