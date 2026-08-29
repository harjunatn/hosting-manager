import type { CurrencyCode } from "@/lib/supabase/database.types";

export function lineAmount(quantity: number, unitPrice: string): string {
  const cents = Math.round(Number.parseFloat(unitPrice) * 100);
  if (!Number.isFinite(cents) || quantity <= 0) {
    throw new Error("Invalid money input");
  }
  return ((cents * quantity) / 100).toFixed(2);
}

export function formatMoney(amount: string | number, currency: CurrencyCode) {
  const value = typeof amount === "number" ? amount : Number.parseFloat(amount);
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}
