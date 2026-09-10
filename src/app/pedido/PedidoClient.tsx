"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, round2 } from "@/lib/format";
import type { CategoryDTO, ProductDTO, PendingOrderDTO } from "@/lib/types";

const STORAGE_KEY = "heladeria_mesero_cart";

interface CartLine {
  product: ProductDTO;
  quantity: number;
  notes: string;
}

export function PedidoClient({
  categories,
  pendingOrders,
  hasOpenRegister,
  userRole,
  userName,
}: {
  categories: CategoryDTO[];
  pendingOrders: PendingOrderDTO[];
  hasOpenRegister: boolean;
  userRole: string;
  userName: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, CartLine>>({});
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"nuevo" | "mis-pedidos" | "listos">("nuevo");

  // Mostrar todos los pedidos pendientes (ya no filtramos por mesero)
  const myPendingOrders = useMemo(() => pendingOrders, [pendingOrders]);

  const readyOrders = useMemo(() => pendingOrders, [pendingOrders]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCart(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

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
      return matchesCategory && matchesSearch && product.inStock && product.stockQuantity > 0;
    });
  }, [allProducts, search, selectedCategory]);

  const lines = Object.values(cart);
  const subtotal = round2(
    lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

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

  function clearCart() {
    setCart({});
    localStorage.removeItem(STORAGE_KEY);
  }

  function openCheckout() {
    if (lines.length === 0) return;
    setError(null);
    setCheckoutOpen(true);
  }

  async function submitOrder(status: "PENDING" | "PAID" = "PENDING") {
    if (lines.length === 0) return;
    if (!customerName.trim()) {
      setError("Por favor ingresa el nombre del cliente");
      return;
    }
    if (!tableNumber.trim()) {
      setError("Por favor ingresa el número de mesa");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status,
          customerName: customerName.trim(),
          tableNumber: Number(tableNumber),
          items: lines.map((line) => ({
            productId: line.product.id,
            quantity: line.quantity,
            notes: line.notes.trim() || null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo enviar el pedido");
        return;
      }

      setSuccess(true);
      clearCart();
      setCustomerName("");
      setTableNumber("");
      setNotes("");
      setCheckoutOpen(false);
      setActiveTab("mis-pedidos");

      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function payOrder(orderId: number, paymentMethod: "CASH" | "TRANSFER" | "CARD", cashReceived?: number) {
    setSubmitting(true);
    setError(null);

    try {
      const body: { action: "pay"; paymentMethod: string; cashReceived?: number } = {
        action: "pay",
        paymentMethod,
      };
      if (paymentMethod === "CASH" && cashReceived !== undefined) {
        body.cashReceived = round2(cashReceived);
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "No se pudo cobrar el pedido");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700",
      PAID: "bg-emerald-100 text-emerald-700",
      CANCELLED: "bg-rose-100 text-rose-700",
    };
    return styles[status] || "bg-slate-100 text-slate-700";
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-rose-50 to-amber-50">
      <header className="sticky top-0 z-40 border-b border-pink-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-800">
            <span className="text-2xl">🍦</span>
            <span>Mesero: <span className="text-pink-500">{userName}</span></span>
          </div>
          <div className="flex items-center gap-2">
            {lines.length > 0 && (
              <button
                onClick={openCheckout}
                className="flex items-center gap-1.5 rounded-full bg-pink-500 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-pink-600"
              >
                <span>🛒</span>
                <span>{itemCount}</span>
                <span className="font-extrabold">{formatMoney(subtotal)}</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 px-4 pb-3 border-b border-pink-100">
          {[
            { key: "nuevo", label: "🆕 Nuevo", count: itemCount },
            { key: "mis-pedidos", label: "📋 Mis pedidos", count: myPendingOrders.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-t-xl px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "bg-white text-pink-600 shadow"
                  : "text-slate-500 hover:bg-pink-50"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 pb-24">
        {activeTab === "nuevo" && (
          <>
            <div className="mb-4 space-y-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto… 🍦"
                className="w-full rounded-full border border-pink-100 bg-white px-5 py-3 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
              />
              <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === null
                      ? "bg-pink-500 text-white shadow"
                      : "bg-white text-slate-600 shadow-sm hover:bg-pink-50"
                  }`}
                >
                  Todos
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedCategory === category.id
                        ? "bg-pink-500 text-white shadow"
                        : "bg-white text-slate-600 shadow-sm hover:bg-pink-50"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-12 text-center">
                <p className="text-4xl">🍦</p>
                <p className="mt-2 font-semibold text-slate-500">No hay productos disponibles</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleProducts.map((product) => {
                  const soldOut = !product.inStock || product.stockQuantity <= 0;
                  const inCart = cart[product.id]?.quantity ?? 0;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => addProduct(product)}
                      className={`relative flex min-h-[120px] flex-col justify-between rounded-2xl border p-3 text-left shadow-sm transition ${
                        soldOut
                          ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                          : "border-pink-100 bg-white hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md active:scale-95"
                      } ${inCart > 0 ? "ring-2 ring-pink-300" : ""}`}
                    >
                      {inCart > 0 && (
                        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white">
                          {inCart}
                        </span>
                      )}
                      <span className="pr-6 text-sm font-bold leading-snug text-slate-700">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt=""
                            className="mb-1.5 h-12 w-12 rounded-lg object-cover"
                          />
                        ) : null}
                        {product.name}
                      </span>
                      <span className="mt-2 flex items-end justify-between gap-1">
                        <span className="text-base font-extrabold text-pink-600">
                          {formatMoney(product.price)}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            soldOut ? "text-rose-400" : "text-emerald-600"
                          }`}
                        >
                          {soldOut ? "Agotado" : `${product.stockQuantity} ${product.unit}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === "mis-pedidos" && (
          <div className="space-y-3">
            {myPendingOrders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-pink-200 bg-white/70 p-12 text-center">
                <p className="text-4xl">📋</p>
                <p className="mt-2 font-semibold text-slate-500">No tienes pedidos pendientes</p>
                <p className="text-sm text-slate-400">Los pedidos que tomes aparecerán aquí</p>
              </div>
            ) : (
              myPendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-slate-800">Cliente: {order.customerName ?? "—"}</p>
                      <p className="text-sm text-slate-600">Mesa {order.tableNumber ?? "—"}</p>
                      <p className="text-xs text-slate-400">{formatDate(order.createdAt)} · #{order.orderNumber}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${getStatusBadge(order.status ?? "PENDING")}`}>
                      {order.status ?? "PENDING"}
                    </span>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex justify-between text-slate-600">
                        <span>{item.quantity}× {item.productName}</span>
                        <span className="font-semibold">{formatMoney(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between text-slate-500">
                    <span>Total</span>
                    <span className="font-extrabold text-pink-600">{formatMoney(order.total)}</span>
                  </div>
                  {!hasOpenRegister && order.status === "PENDING" && (
                    <p className="mt-2 text-xs text-amber-600">⚠️ Caja cerrada: no se puede cobrar aún</p>
                  )}
                  {hasOpenRegister && order.status === "PENDING" && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => payOrder(order.id, "TRANSFER")}
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-blue-500 py-2 text-sm font-bold text-white transition hover:bg-blue-600 disabled:opacity-40"
                      >
                        💳 Transferencia
                      </button>
                      <button
                        onClick={() => {
                          const cash = prompt(`Total: ${formatMoney(order.total)}\nEfectivo recibido:`);
                          if (cash !== null) {
                            const amount = Number(cash);
                            if (!isNaN(amount) && amount >= order.total) {
                              payOrder(order.id, "CASH", amount);
                            } else {
                              setError("El efectivo recibido es menor que el total");
                            }
                          }
                        }}
                        disabled={submitting}
                        className="flex-1 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-40"
                      >
                        💵 Efectivo
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {error && !checkoutOpen && (
          <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-50 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 shadow-lg animate-slide-up">
            {error}
          </div>
        )}

        {success && (
          <div className="fixed bottom-24 left-4 right-4 max-w-md mx-auto z-50 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-600 shadow-lg animate-slide-up">
            ✅ Pedido #{itemCount} enviado a cocina - Mesa {tableNumber}
          </div>
        )}
      </main>

      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm pb-0"
          onClick={() => !submitting && setCheckoutOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-extrabold text-slate-800">Confirmar pedido</h3>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-500">
              Total: <span className="font-extrabold text-pink-600">{formatMoney(subtotal)}</span>
            </p>

            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Cliente *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  required
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Mesa *</label>
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Ej: 5"
                  min="1"
                  required
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Notas / Alergias (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Sin azúcar, alergia a nueces..."
                  rows={2}
                  className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-300 focus:ring-2 focus:ring-pink-200"
                />
              </div>
            </div>

            <div className="mb-4 space-y-2 max-h-40 overflow-y-auto">
              {lines.map((line) => (
                <div key={line.product.id} className="flex items-center justify-between gap-2 py-2 border-b border-pink-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{line.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {line.quantity} × {formatMoney(line.product.price)} = {formatMoney(line.product.price * line.quantity)}
                    </p>
                    {line.notes && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">{line.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(line.product.id, round2(line.quantity - 1))}
                      className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-pink-500 transition hover:bg-slate-200"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-extrabold">{line.quantity}</span>
                    <button
                      onClick={() => addProduct(line.product)}
                      className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold text-pink-500 transition hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xl font-extrabold text-slate-800 border-t border-pink-50 pt-3 mb-4">
              <span>Total</span>
              <span className="text-pink-600">{formatMoney(subtotal)}</span>
            </div>

            {error && (
              <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setCheckoutOpen(false)}
                disabled={submitting}
                className="flex-1 rounded-2xl bg-slate-100 py-3 font-bold text-slate-500 transition hover:bg-slate-200 disabled:opacity-40"
              >
                Seguir agregando
              </button>
              <button
                onClick={() => submitOrder("PENDING")}
                disabled={submitting || !customerName.trim() || !tableNumber.trim()}
                className="flex-[2] rounded-2xl bg-amber-500 py-3 font-extrabold text-white shadow-lg shadow-amber-200 transition enabled:hover:bg-amber-600 disabled:opacity-40"
              >
                {submitting ? "Enviando…" : "📤 Enviar a cocina"}
              </button>
              {hasOpenRegister && (
                <button
                  onClick={() => submitOrder("PAID")}
                  disabled={submitting || !customerName.trim() || !tableNumber.trim()}
                  className="flex-[2] rounded-2xl bg-emerald-500 py-3 font-extrabold text-white shadow-lg shadow-emerald-200 transition enabled:hover:bg-emerald-600 disabled:opacity-40"
                >
                  💳 Cobrar ya
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  );
}