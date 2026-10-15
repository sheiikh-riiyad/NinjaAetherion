import type { DemoReceipt } from "./demo-payment";
export type Currency = "BDT" | "USD";
export function installments(total: number) {
  const deposit = Math.round(total * 20 / 100);
  const review = Math.round(total * 50 / 100);
  return [deposit, review, total - deposit - review];
}
export function installmentKey(orderId: string, index: number, total: number, currency: Currency) { return `${orderId}:installment-${index}:${currency}:${total}`; }
export function parseOrderBudget(budget: string) {
  const match = /^(BDT|USD)\s+((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)$/.exec(budget);
  if (!match) return null;
  const [whole, fraction = ""] = match[2].replaceAll(",", "").split(".");
  const total = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return total >= 100 && total <= 99999999 ? { currency: match[1] as Currency, total } : null;
}
export function installmentAvailability(status: string, paid: boolean[]) { return [true, paid[0] && ["Review", "Delivered"].includes(status), paid[0] && paid[1] && status === "Delivered"]; }
export function successfulInstallment(receipt: DemoReceipt | null, id: string, amount: number, currency: Currency) {
  return !!receipt && receipt.mode === "demo" && receipt.orderId === id && receipt.outcome === "success" && receipt.amountMinor === amount && receipt.currency === currency;
}
