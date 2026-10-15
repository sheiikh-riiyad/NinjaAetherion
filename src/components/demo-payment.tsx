"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { demoAmountMinor, readDemoReceipt, type DemoOutcome, type DemoReceipt } from "@/lib/demo-payment";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback); window.addEventListener("demo-payment-change", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("demo-payment-change", callback); };
}

export function DemoPayment({ orderId = "practice-order", title = "Practice project payment", ownerKey = "guest", fixedAmountMinor, fixedCurrency, onComplete }: { orderId?: string; title?: string; ownerKey?: string; fixedAmountMinor?: number; fixedCurrency?: "BDT" | "USD"; onComplete?: (receipt: DemoReceipt | null) => void }) {
  const key = `aetherion:demo-payment:${ownerKey}:${orderId}`;
  const stored = useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key); } catch { return null; } }, () => null);
  const saved = readDemoReceipt(stored, orderId);
  const [current, setCurrent] = useState<DemoReceipt | null>(null);
  const [amount, setAmount] = useState(fixedAmountMinor === undefined ? "1000.00" : (fixedAmountMinor / 100).toFixed(2));
  const [currency, setCurrency] = useState<"BDT" | "USD">(fixedCurrency || "BDT");
  const [outcome, setOutcome] = useState<DemoOutcome>("success");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const receipt = current || saved;
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (timer.current) return;
    const amountMinor = fixedAmountMinor ?? demoAmountMinor(amount);
    if (amountMinor === null) { setError("Enter a demo amount from 0.01 to 999,999.99, with up to two decimal places."); return; }
    setBusy(true); setError(""); setStorageNote("");
    timer.current = setTimeout(() => {
      const result: DemoReceipt = { mode: "demo", orderId, reference: `DEMO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`, amountMinor, currency, outcome, createdAt: new Date().toISOString() };
      setCurrent(result);
      onComplete?.(result);
      try { localStorage.setItem(key, JSON.stringify(result)); window.dispatchEvent(new Event("demo-payment-change")); }
      catch { setStorageNote("This browser could not save the result. You can still download the demo receipt."); }
      timer.current = null; setBusy(false);
    }, 1000);
  }
  function reset() {
    try { localStorage.removeItem(key); window.dispatchEvent(new Event("demo-payment-change")); }
    catch { setStorageNote("This browser could not clear its saved demo result."); }
    setCurrent(null); setError(""); onComplete?.(null);
  }
  function download() {
    if (!receipt) return;
    const text = `DEMO PAYMENT RECEIPT - NO MONEY TRANSFERRED\n\nProject: ${title}\nOrder: ${orderId}\nReference: ${receipt.reference}\nTest outcome: ${receipt.outcome}\nDemo amount: ${(receipt.amountMinor / 100).toFixed(2)} ${receipt.currency}\nTime: ${receipt.createdAt}\n\nLocal simulation only. This is not proof of payment and was not processed by Visa or a bank.`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `${receipt.reference}.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="demo-checkout" aria-label="Demo payment checkout">
    <header><div><p className="eyebrow">TRY THE CHECKOUT EXPERIENCE</p><h2>Demo payment</h2></div><span className="demo-mode-badge">TEST MODE</span></header>
    <div className="demo-payment-notice">No money is charged. This is a local simulation, separate from Visa&apos;s sandbox. Use the built-in test method; no card details are needed.</div>
    <div className="demo-checkout-grid"><form className="contact-form demo-payment-form" onSubmit={submit}><fieldset disabled={busy}>
      <div className="demo-project"><span>PROJECT</span><h3>{title}</h3><small>Order #{orderId.slice(-12).toUpperCase()}</small></div>
      <div className="order-form-pair"><label>Demo amount<input inputMode="decimal" value={amount} readOnly={fixedAmountMinor !== undefined} onChange={event => setAmount(event.target.value)} maxLength={9} required aria-describedby="demo-amount-note" /></label><label>Currency<select value={currency} disabled={fixedCurrency !== undefined} onChange={event => setCurrency(event.target.value as "BDT" | "USD")}><option>BDT</option><option>USD</option></select></label></div>
      <p id="demo-amount-note" className="order-hint">Test amount only. Your order budget and project status stay unchanged.</p>
      <div className="demo-test-method"><span aria-hidden="true">▣</span><div><strong>Built-in demo card</strong><p>Test payment method · No real card connected</p></div><span className="demo-mode-badge">DEMO</span></div>
      <fieldset className="demo-scenarios"><legend>Choose what to test</legend>{([["success", "Successful payment", "Show a demo confirmation and receipt."], ["declined", "Declined payment", "Try the failed-payment experience."], ["cancelled", "Cancelled checkout", "Test leaving checkout without paying."]] as const).map(([value, label, description]) => <label key={value}><input type="radio" name="demo-outcome" value={value} checked={outcome === value} onChange={() => setOutcome(value)} /><span><strong>{label}</strong><small>{description}</small></span></label>)}</fieldset>
      <button className="button primary" type="submit">{busy ? "Simulating payment..." : "Run demo payment"}</button>
    </fieldset>{error && <p role="alert" className="orders-error">{error}</p>}{busy && <p role="status" className="order-hint">Processing the selected test scenario...</p>}</form>
    <aside className="demo-result" aria-live="polite" aria-busy={busy}>{receipt ? <><span className={`demo-result-icon demo-${receipt.outcome}`} aria-hidden="true">{receipt.outcome === "success" ? "✓" : receipt.outcome === "declined" ? "!" : "×"}</span><span className="demo-mode-badge">DEMO RESULT</span><h3>{receipt.outcome === "success" ? "Demo payment successful" : receipt.outcome === "declined" ? "Demo payment declined" : "Demo checkout cancelled"}</h3><p>{receipt.outcome === "success" ? "Your test checkout is complete. No funds were transferred." : receipt.outcome === "declined" ? "The simulated card was declined. Choose another scenario and try again." : "The simulated checkout was cancelled. No payment was made."}</p><strong className="demo-result-amount">{new Intl.NumberFormat(undefined, { style: "currency", currency: receipt.currency }).format(receipt.amountMinor / 100)}</strong><dl><dt>Demo reference</dt><dd>{receipt.reference}</dd><dt>Test time</dt><dd>{new Date(receipt.createdAt).toLocaleString()}</dd></dl><button type="button" className="auth-secondary" onClick={download}>Download demo receipt</button><button type="button" className="demo-reset" disabled={busy} onClick={reset}>Clear test result</button></> : <><span className="demo-result-icon" aria-hidden="true">↗</span><h3>Practice before going live.</h3><p>Select a test scenario and run the checkout. Your simulated result will appear here.</p></>}{storageNote && <p role="status">{storageNote}</p>}<small>Saved only in this browser. Demo receipts are not proof of payment.</small></aside></div>
  </section>;
}
