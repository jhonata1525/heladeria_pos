export function formatMoney(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
