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
  PendingOrderItemDTO,
  ProductDTO,
  TicketConfigDTO,
} from "@/lib/types";
import { TicketImpresion } from "@/components/TicketImpresion";

const QUICK_CASH = [5000, 10000, 20000, 50000];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "CASH", label: "Efectivo", icon: "💵" },
  { value: "TRANSFER", label: "Nequi / Transferencia", icon: "📱" },
  { value: "CARD", label: "Tarjeta", icon: "💳" },
];

type TicketItemSnapshot = {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
};

type CheckoutResult = {
  orderNumber: number;
  total: number;
  changeGiven: number | null;
  customerName: string;
  paymentMethod: PaymentMethod;
  items: TicketItemSnapshot[];
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
  ticketConfig,
}: {
  categories: CategoryDTO[];
  pendingOrders: PendingOrderDTO[];
  hasOpenRegister: boolean;
  userRole: string;
  ticketConfig: TicketConfigDTO;
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
  const customerNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [livePendingOrders, setLivePendingOrders] = useState<PendingOrderDTO[]>(pendingOrders);
  const [syncedPendingOrders, setSyncedPendingOrders] = useState<PendingOrderDTO[]>(pendingOrders);
  const [liveHasOpenRegister, setLiveHasOpenRegister] = useState(hasOpenRegister);
  const [detailOrder, setDetailOrder] = useState<PendingOrderDTO | null>(null);

  if (pendingOrders !== syncedPendingOrders) {
    setSyncedPendingOrders(pendingOrders);
    setLivePendingOrders(pendingOrders);
  }

  const openOrderDetail = (order: PendingOrderDTO) => {
    const found = livePendingOrders.find((o) => o.id === order.id);
    setDetailOrder(found ?? order);
  };

  const eventSourceRef = useRef<EventSource | null>(null);

  const allProducts = useMemo(
    () => categories.flatMap((category) => category.products),
    [categories],
  );

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
        router.refresh();
      } catch (e) {
        console.error("Failed to parse order:created", e);
      }
    });

    es.addEventListener("order:updated", (event) => {
      try {
        const update = JSON.parse(event.data) as SSEOrderUpdated;
        if (update.status !== "PENDING") {
          setLivePendingOrders((prev) => prev.filter((o) => o.id !== update.id));
        }
        router.refresh();
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

  const activeProducts = useMemo(
    () => allProducts.filter((product) => product.inStock && product.stockQuantity > 0),
    [allProducts],
  );

  const quickCodeMap = useMemo(() => {
    const map = new Map<string, ProductDTO>();
    activeProducts.forEach((product) => {
      if (product.quickCode?.trim()) {
        map.set(normalizeText(product.quickCode), product);
      }
    });
    return map;
  }, [activeProducts]);

  const categoryNameById = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((category) => {
      map.set(category.id, normalizeText(category.name));
    });
    return map;
  }, [categories]);

  const isFiltering = selectedCategory !== null || search.trim() !== "";

  const visibleProducts = useMemo(() => {
    const term = normalizeText(search);

    if (!isFiltering) return [];

    if (term.length > 0) {
      const matches = (product: ProductDTO, value: string) => {
        const matchesName = normalizeText(product.name).includes(value);
        const matchesCode = product.quickCode
          ? normalizeText(product.quickCode).includes(value)
          : false;
        const matchesCategory = (
          categoryNameById.get(product.categoryId) ?? ""
        ).includes(value);
        return matchesName || matchesCode || matchesCategory;
      };

      const directMatches = activeProducts.filter((product) =>
        matches(product, term),
      );

      if (directMatches.length === 0 && term.endsWith("s") && term.length > 1) {
        const singularTerm = term.slice(0, -1);
        return activeProducts.filter((product) => matches(product, singularTerm));
      }

      return directMatches;
    }

    return allProducts.filter(
      (product) =>
        selectedCategory === null || product.categoryId === selectedCategory,
    );
  }, [
    activeProducts,
    allProducts,
    search,
    selectedCategory,
    isFiltering,
    categoryNameById,
  ]);

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
    if (!customerName.trim()) {
      setError("⚠️ Escribe el nombre del cliente antes de cobrar");
      customerNameRef.current?.focus();
      return;
    }
    setError(null);
    setResult(null);
    setPayMethod("CASH");
    setCashInput("");
    setReferenceNumber("");
    setCheckoutOpen(true);
  }

  async function submitOrder(status: "PENDING" | "PAID") {
    if (lines.length === 0) return;
    if (!customerName.trim()) {
      setError("⚠️ El nombre del cliente es obligatorio");
      customerNameRef.current?.focus();
      setSubmitting(false);
      return;
    }
    setError(null);
    setSubmitting(true);

    const itemsSnapshot: TicketItemSnapshot[] = lines.map((line) => ({
      nombre: line.product.name,
      cantidad: line.quantity,
      precioUnitario: line.product.price,
      subtotal: round2(line.product.price * line.quantity),
    }));
    const totalSnapshot = subtotal;
    const customerSnapshot = customerName.trim();
    const payMethodSnapshot = payMethod;
    const changeSnapshot = status === "PAID" && payMethod === "CASH" ? change : null;

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
            customerName: customerSnapshot,
            tableNumber: tableNumber.trim() ? Number(tableNumber) : null,
            ...(status === "PAID"
              ? {
                  paymentMethod: payMethod,
                  cashReceived: received,
                  referenceNumber: payMethod !== "CASH" ? referenceNumber : undefined,
                }
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
      if (status === "PAID") {
        setResult({
          orderNumber,
          total: totalSnapshot,
          changeGiven: changeSnapshot,
          customerName: customerSnapshot,
          paymentMethod: payMethodSnapshot,
          items: itemsSnapshot,
        });
      }
      clearCart();
      setCustomerName("");
      setTableNumber("");
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
    setCheckoutOpen(true);
  }

  async function cancelPendingOrder(order: PendingOrderDTO) {
    if (userRole !== "ADMIN") {
      setError("Solo los administradores pueden cancelar pedidos");
      return;
    }
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

  async function addItemsToPendingOrder(order: PendingOrderDTO) {
    if (lines.length === 0) {
      setError("⚠️ Selecciona primero los productos en la comanda para agregarlos");
      return;
    }
    const itemsToAdd = lines.map((line) => ({
      productId: line.product.id,
      quantity: line.quantity,
      notes: line.notes.trim() || null,
    }));
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addItems",
          items: itemsToAdd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "No se pudieron agregar los productos");
        return;
      }
      const updated = data?.order as
        | {
            id: number;
            total: number;
            items: Array<{
              productId: number;
              quantity: number;
              price: number;
              notes: string | null;
              createdAt: string;
              product?: { name: string } | null;
            }>;
          }
        | undefined;
      if (updated?.items) {
        const mappedItems: PendingOrderItemDTO[] = updated.items.map((it) => ({
          productId: it.productId,
          productName: it.product?.name ?? `Producto ${it.productId}`,
          quantity: it.quantity,
          unitPrice: it.price,
          subtotal: round2(it.price * it.quantity),
          notes: it.notes ?? null,
          createdAt: it.createdAt,
        }));
        setLivePendingOrders((prev) =>
          prev.map((o) =>
            o.id === order.id ? { ...o, total: updated.total, items: mappedItems } : o,
          ),
        );
      }
      clearCart();
      router.refresh();
    } catch {
      setError("Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <section>
        <div className="mb-4 space-y-3">
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const term = normalizeText(search);
                if (!term) return;
                const product =
                  quickCodeMap.get(term) ??
                  (visibleProducts.length === 1 ? visibleProducts[0] : null);
                if (product) {
                  addProduct(product);
                  setSearch("");
                  requestAnimationFrame(() => searchInputRef.current?.focus());
                }
              }
            }}
            placeholder="Buscar producto por nombre o código rápido..."
            className="w-full rounded-full border-[1.5px] border-[#FF9CEE] bg-[#FDF8FC] px-5 py-3 text-base shadow-sm outline-none placeholder:text-slate-400 focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                setSearch("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedCategory === null && search.trim() === ""
                  ? "bg-[#FF9CEE] text-[#2B1424] shadow font-bold"
                  : "bg-[#FDF8FC] text-slate-700 shadow-sm border border-[#FF9CEE] hover:bg-[#FF9CEE]/30"
              }`}
            >
              Categorías
            </button>
            {categories.map((category) => {
              return (
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
              );
            })}
          </div>
        </div>

        {livePendingOrders.length > 0 && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="mb-2 text-sm font-bold text-amber-700">
              ⏳ Pedidos en cola ({livePendingOrders.length})
            </h2>
            <ul className="space-y-2">
              {livePendingOrders.map((order) => {
                const totalUnits = order.items.reduce((sum, it) => sum + it.quantity, 0);
                return (
                  <li
                    key={order.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#FAF7F5] px-3 py-2.5 shadow-sm"
                  >
                    <div className="text-sm">
                      <span className="font-bold text-slate-800">
                        #{order.orderNumber}
                      </span>
                      {order.customerName && (
                        <span className="font-semibold text-slate-700"> · {order.customerName}</span>
                      )}
                      {order.tableNumber && (
                        <span className="text-slate-500"> · Mesa {order.tableNumber}</span>
                      )}
                      <span className="text-slate-500">
                        {" "}· {totalUnits} prod. · <strong className="text-[#D64575]">{formatMoney(order.total)}</strong>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openOrderDetail(order)}
                        className="rounded-full bg-[#FF9CEE]/50 px-3 py-1.5 text-xs font-bold text-[#2B1424] transition hover:bg-[#FF9CEE]"
                        title="Ver productos del pedido"
                      >
                        👁️ Ver
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => addItemsToPendingOrder(order)}
                        className="rounded-full bg-[#85E3FF] px-3 py-1.5 text-xs font-bold text-[#1F1B24] transition hover:bg-[#67D5F7] disabled:opacity-40"
                        title="Sumar los productos de la comanda activa a este pedido"
                      >
                        + Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => loadPendingOrder(order)}
                        className="rounded-full bg-[#D64575] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#BE3663]"
                      >
                        Cobrar
                      </button>
                      {userRole === "ADMIN" && (
                        <button
                          type="button"
                          onClick={() => cancelPendingOrder(order)}
                          className="rounded-full bg-[#F3E6EB] px-3 py-1.5 text-xs font-bold text-[#BE3663] transition hover:bg-[#E4C7D2]"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
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
          <p className="mb-4 rounded-xl bg-[#F3E6EB] px-4 py-3 text-sm font-semibold text-[#BE3663]">
            {error}
          </p>
        )}

        {!isFiltering ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {categories.map((category) => {
              const availableCount = category.products.filter(
                (p) => p.inStock && p.stockQuantity > 0,
              ).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="group flex flex-col justify-between rounded-3xl border-[1.5px] border-[#FF9CEE] bg-[#FDF8FC] p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-[#FFF0FA] hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF9CEE]/30 text-xl">
                      🍨
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-base font-extrabold text-slate-800 group-hover:text-[#C43E96]">
                      {category.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {availableCount} productos disponibles
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between border-b border-[#FF9CEE]/60 pb-2.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearch("");
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FDF8FC] border border-[#FF9CEE] px-3.5 py-1.5 text-xs font-bold text-[#C43E96] shadow-sm transition hover:bg-[#FF9CEE]/25"
              >
                ← Ver todas las categorías
              </button>
              <span className="text-xs font-semibold text-slate-600">
                {visibleProducts.length} resultado(s)
              </span>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#E4C7D2] bg-[#FAF7F5]/70 p-12 text-center">
                <p className="text-4xl">🍦</p>
                <p className="mt-2 font-semibold text-slate-500">
                  No hay productos que coincidan.
                </p>
                <Link
                  href="/productos"
                  className="mt-1 inline-block text-sm font-semibold text-[#D64575] underline"
                >
                  Revisa el catálogo en Productos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
                {visibleProducts.map((product) => {
                  const soldOut = !product.inStock || product.stockQuantity <= 0;
                  const lowStock = !soldOut && product.stockQuantity <= 5;
                  const inCart = cart[product.id]?.quantity ?? 0;
                  const categoryName =
                    categories.find((cat) => cat.id === product.categoryId)?.name ?? "";

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => addProduct(product)}
                      className={`group relative flex flex-col justify-between rounded-2xl border-[1.5px] p-3.5 text-left transition ${
                        soldOut
                          ? "cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-60"
                          : inCart > 0
                            ? "border-[#D64575] bg-[#FFF0FA] shadow-md"
                            : "border-[#FF9CEE] bg-[#FDF8FC] shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                      }`}
                    >
                      <div>
                        <div className="mb-2 flex items-center justify-between gap-1">
                          <span className="truncate rounded-md bg-[#F3E6EB] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#9E2B57]">
                            {categoryName}
                          </span>
                          {product.quickCode && (
                            <span className="shrink-0 rounded-full bg-[#85E3FF] px-2 py-0.5 text-[10px] font-extrabold text-[#1F1B24]">
                              Cód. {product.quickCode}
                            </span>
                          )}
                        </div>

                        <p className="line-clamp-2 text-sm font-extrabold leading-snug text-slate-800 group-hover:text-[#C43E96]">
                          {product.name}
                        </p>
                      </div>

                      {inCart > 0 && (
                        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#D64575] text-xs font-extrabold text-white shadow">
                          {inCart}
                        </span>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-1 border-t border-[#FF9CEE]/30 pt-2.5">
                        <span className="text-base font-extrabold text-[#C43E96]">
                          {formatMoney(product.price)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            soldOut
                              ? "bg-rose-100 text-rose-700"
                              : lowStock
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {soldOut
                            ? "Agotado"
                            : `${product.stockQuantity} ${product.unit}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setError(null);
                }}
                ref={customerNameRef}
                placeholder="Ej: Juan Pérez"
                required
                className="flex-1 rounded-lg border border-[#FF9CEE] bg-[#FDF8FC] px-3 py-2 text-sm outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
                minLength={1}
              />
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal ({itemCount} art.)</span>
              <span className="font-semibold">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold text-slate-800">
              <span>Total</span>
              <span className="text-[#D64575]">{formatMoney(subtotal)}</span>
            </div>

            <button
              type="button"
              disabled={lines.length === 0 || submitting}
              onClick={() => {
                if (!customerName.trim()) {
                  setError("⚠️ Escribe el nombre del cliente para dejar el pedido en cola");
                  customerNameRef.current?.focus();
                  return;
                }
                submitOrder("PENDING");
              }}
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

      {detailOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          onClick={() => setDetailOrder(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border-[1.5px] border-[#FF9CEE] bg-[#FAF7F5] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#FF9CEE]/40 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Pedido #{detailOrder.orderNumber}
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Cliente: {detailOrder.customerName || "Mostrador"}
                  {detailOrder.tableNumber ? ` · Mesa ${detailOrder.tableNumber}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="rounded-full bg-[#F3E6EB] px-2.5 py-1 text-xs font-bold text-[#BE3663]"
              >
                ✕
              </button>
            </div>

            <div className="my-4 max-h-64 space-y-2 overflow-y-auto">
              {detailOrder.items.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Sin detalle de productos disponible.
                </p>
              ) : (
                detailOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
                  >
                    <div>
                      <span className="font-bold text-[#D64575]">{item.quantity}x </span>
                      <span className="font-semibold text-slate-800">
                        {item.productName ?? `Producto #${item.productId}`}
                      </span>
                      {item.notes && (
                        <p className="text-xs italic text-slate-500">Nota: {item.notes}</p>
                      )}
                    </div>
                    <span className="font-bold text-slate-700">
                      {formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#FF9CEE]/40 pt-3 text-base font-extrabold text-slate-800">
              <span>Total pendiente:</span>
              <span className="text-[#D64575]">{formatMoney(detailOrder.total)}</span>
            </div>

            <button
              type="button"
              onClick={() => setDetailOrder(null)}
              className="mt-4 w-full rounded-2xl bg-[#FF9CEE] py-2.5 text-sm font-extrabold text-[#2B1424] transition hover:bg-[#F282DF]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

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
              <span className="font-extrabold text-[#D64575]">
                {formatMoney(subtotal)}
              </span>
            </p>

            {lines.length > 0 && (
              <div className="mb-4 rounded-lg bg-amber-50 p-3">
                <h4 className="text-sm font-bold text-amber-800 mb-3">Productos de la comanda</h4>
                <div className="space-y-2 text-sm">
                  {lines.map((line) => (
                    <div key={line.product.id} className="flex justify-between items-center py-1">
                      <span>
                        {line.product.name}{" "}
                        {line.quantity > 1 && (
                          <span className="text-[#D64575] font-bold">×{line.quantity}</span>
                        )}
                      </span>
                      {line.notes && (
                        <span className="text-emerald-600 text-xs italic">({line.notes})</span>
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
                  Nombre del cliente *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-xl border border-[#E4C7D2] text-slate-800 bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
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
                  className="w-full rounded-xl border border-[#E4C7D2] text-slate-800 bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
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
                      ? "border-[#D64575] bg-[#F3E6EB] text-[#D64575]"
                      : "border-slate-200 text-slate-500 hover:border-[#E4C7D2]"
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
                    className="mt-1 w-full rounded-xl border border-[#E4C7D2] text-slate-800 bg-[#FAF7F5] px-4 py-3 text-base outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
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
                    className="mt-1 w-full rounded-xl border border-[#E4C7D2] bg-[#F3E6EB]/50 px-4 py-3 text-2xl font-extrabold text-slate-800 outline-none focus:border-[#FF9CEE] focus:ring-2 focus:ring-[#E052B5]"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCashInput(String(subtotal))}
                    className="rounded-full bg-[#DFF2EE] px-3 py-1.5 text-xs font-bold text-[#1F7A68] hover:bg-[#CDE8E2]"
                  >
                    Exacto
                  </button>
                  {QUICK_CASH.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashInput(String(amount))}
                      className="rounded-full bg-[#FDF8FC] border border-[#E4C7D2] px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
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
                        ? "bg-[#F3E6EB] text-[#D64575]"
                        : "bg-[#DFF2EE] text-[#1F7A68]"
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
              <p className="mb-3 rounded-xl bg-[#F3E6EB] px-4 py-2.5 text-sm font-semibold text-[#BE3663]">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCheckoutOpen(false)}
                className="flex-1 rounded-2xl bg-[#FDF8FC] border border-slate-200 py-3 font-bold text-slate-500 transition hover:bg-slate-100 disabled:opacity-40"
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
                className="flex-[2] rounded-2xl bg-[#D64575] py-3 font-extrabold text-white shadow-lg transition enabled:hover:bg-[#BE3663] disabled:opacity-40"
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
              <div className="mt-4 rounded-2xl bg-[#DFF2EE] px-4 py-4 text-[#1F7A68]">
                <p className="text-xs font-bold uppercase tracking-wide">
                  Cambio a entregar
                </p>
                <p className="text-3xl font-extrabold">
                  {formatMoney(result.changeGiven)}
                </p>
              </div>
            )}
            <div className="mt-4">
              <TicketImpresion
                config={ticketConfig}
                fechaHora={new Date().toLocaleString("es-CO")}
                referenciaPedido={String(result.orderNumber)}
                nombreCliente={result.customerName}
                cajero="Cajero actual"
                items={result.items}
                total={result.total}
                metodoPago={result.paymentMethod}
              />
            </div>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="mt-4 w-full rounded-2xl bg-[#D64575] py-3 font-extrabold text-white transition hover:bg-[#BE3663]"
            >
              Nueva venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}