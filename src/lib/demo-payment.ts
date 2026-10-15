export type DemoOutcome = "success" | "declined" | "cancelled";
export type DemoReceipt = { mode: "demo"; orderId: string; reference: string; amountMinor: number; currency: "BDT" | "USD"; outcome: DemoOutcome; createdAt: string };
export function demoAmountMinor(value: string) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  return amount > 0 && amount <= 99999999 ? amount : null;
}
export function readDemoReceipt(value: string | null, orderId: string): DemoReceipt | null {
  if (!value) return null;
  try {
    const data = JSON.parse(value);
    return data && data.mode === "demo" && data.orderId === orderId && typeof data.reference === "string" && data.reference.startsWith("DEMO-") && Number.isInteger(data.amountMinor) && data.amountMinor > 0 && data.amountMinor <= 99999999 && ["BDT", "USD"].includes(data.currency) && ["success", "declined", "cancelled"].includes(data.outcome) && typeof data.createdAt === "string" && Number.isFinite(Date.parse(data.createdAt)) ? data : null;
  } catch { return null; }
}
