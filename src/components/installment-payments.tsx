"use client";

import { useState, useSyncExternalStore } from "react";
import { DemoPayment } from "@/components/demo-payment";
import { readDemoReceipt } from "@/lib/demo-payment";
import { installmentAvailability, installmentKey, installments, successfulInstallment, type Currency } from "@/lib/installments";
import type { OrderStage } from "@/lib/orders";

const labels = ["Upfront deposit", "After project review", "Final balance"];
const percentages = [20, 50, 30];
export function money(amount: number, currency: Currency) { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount / 100); }
function subscribe(callback: () => void) { window.addEventListener("storage", callback); window.addEventListener("demo-payment-change", callback); return () => { window.removeEventListener("storage", callback); window.removeEventListener("demo-payment-change", callback); }; }
export function useInstallmentReceipts(orderId: string, total: number, currency: Currency, ownerKey: string) {
  const keys = [0, 1, 2].map(index => installmentKey(orderId, index, total, currency));
  const snapshot = useSyncExternalStore(subscribe, () => { try { return JSON.stringify(keys.map(id => localStorage.getItem(`aetherion:demo-payment:${ownerKey}:${id}`))); } catch { return "[null,null,null]"; } }, () => "[null,null,null]");
  const amounts = installments(total);
  const values = JSON.parse(snapshot) as (string | null)[];
  const paid = keys.map((id, index) => successfulInstallment(readDemoReceipt(values[index], id), id, amounts[index], currency));
  return [paid[0], paid[0] && paid[1], paid[0] && paid[1] && paid[2]];
}
export function InstallmentSummary({ total, currency }: { total: number; currency: Currency }) {
  return <div className="installment-summary"><div className="installment-total"><span>Project budget</span><strong>{money(total, currency)}</strong></div><div className="installment-cards">{installments(total).map((amount, index) => <div key={labels[index]}><span>{percentages[index]}%</span><strong>{money(amount, currency)}</strong><small>{labels[index]}</small></div>)}</div><p>20% before submitting your order, 50% when the project reaches Review, and the remaining 30% when it is Delivered.</p></div>;
}
export function OrderPaymentPlan({ orderId, title, total, currency, ownerKey, status, admin = false }: { orderId: string; title: string; total: number; currency: Currency; ownerKey: string; status: OrderStage; admin?: boolean }) {
  const [selected, setSelected] = useState(0);
  const paid = useInstallmentReceipts(orderId, total, currency, ownerKey);
  const amounts = installments(total);
  const available = installmentAvailability(status, paid);
  const paidTotal = amounts.reduce((sum, amount, index) => sum + (paid[index] ? amount : 0), 0);
  function clearLaterPayments() {
    try { for (let index = selected + 1; index < 3; index++) localStorage.removeItem(`aetherion:demo-payment:${ownerKey}:${installmentKey(orderId, index, total, currency)}`); window.dispatchEvent(new Event("demo-payment-change")); }
    catch { /* A browser that blocks storage still supports the current simulation. */ }
  }
  return <section className="installment-plan"><h3>Project payment plan <span className="demo-mode-badge">DEMO</span></h3><InstallmentSummary total={total} currency={currency} /><div className="installment-balance"><span>Demo completed: {money(paidTotal, currency)}</span><span>Demo remaining: {money(total - paidTotal, currency)}</span></div><div className="installment-actions">{labels.map((label, index) => <div key={label}><div><strong>{label}</strong><small>{paid[index] ? "Demo complete" : available[index] ? "Ready to test" : index === 1 ? "Unlocks at Review after the deposit" : "Unlocks at Delivered after the first two payments"}</small></div><button className="auth-secondary" disabled={admin || !available[index]} aria-pressed={selected === index} onClick={() => setSelected(index)}>{paid[index] ? "View demo receipt" : `Test ${percentages[index]}% payment`}</button></div>)}</div>
    {admin ? <p className="order-hint">Demo results are saved in the client&apos;s browser. They are not shared payment records or proof that you received money.</p> : available[selected] ? <DemoPayment key={installmentKey(orderId, selected, total, currency)} orderId={installmentKey(orderId, selected, total, currency)} title={`${title} - ${labels[selected]} (${percentages[selected]}%)`} ownerKey={ownerKey} fixedAmountMinor={amounts[selected]} fixedCurrency={currency} onComplete={receipt => { if (receipt?.outcome !== "success") clearLaterPayments(); }} /> : <p className="order-hint">Complete the earlier demo installments first.</p>}
    <p className="order-hint">No real funds are transferred. Project stages are still controlled by the administrator.</p>
  </section>;
}
export function InstallmentPlayground() {
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [status, setStatus] = useState<OrderStage>("Requested");
  return <><div className="order-form contact-form"><h3>Test a 20% / 50% / 30% order</h3><div className="order-form-pair"><label>Demo currency<select value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option>BDT</option><option>USD</option></select></label><label>Demo project stage<select value={status} onChange={event => setStatus(event.target.value as OrderStage)}><option>Requested</option><option>Review</option><option>Delivered</option></select></label></div><p className="order-hint">Practice with a 10,000 project budget. These controls do not update any real order.</p></div><OrderPaymentPlan key={currency} orderId="installment-playground" title="Practice project" total={1000000} currency={currency} status={status} ownerKey="guest" /></>;
}
