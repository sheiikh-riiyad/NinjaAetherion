"use client";

import { useEffect, useState, type FormEvent } from "react";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch, type Timestamp } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { getFirebase } from "@/lib/firebase";
import { CRYPTO_NETWORKS, cryptoQuote, walletAddress, type CryptoNetwork, type WalletSettings } from "@/lib/crypto-payment";
import { installments, parseOrderBudget, type Currency } from "@/lib/installments";
import { demoAmountMinor } from "@/lib/demo-payment";
import type { OrderStage } from "@/lib/orders";
import { InstallmentSummary, money } from "@/components/installment-payments";
import { AttachmentPreview, ChatAttachment, type Attachment } from "@/components/chat-attachment";

type Evidence = { id: string; installment: number; status: "pending" | "verified" | "rejected"; address: string; coin: string; network: CryptoNetwork; cryptoAmount: number; amountMinor: number; currency: Currency; txid: string; screenshot: Attachment; createdAt: Timestamp | null; note?: string };
const labels = ["20% upfront deposit", "50% review payment", "30% final balance"];
export function EnableLegacyCrypto({ orderId, budget, status }: { orderId: string; budget: string; status: OrderStage }) {
  const initial = parseOrderBudget(budget);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); const total = demoAmountMinor(String(data.get("budget") || "")); const currency = String(data.get("currency"));
    if (total === null || total < 100) { setError("Enter a numeric budget of at least 1.00."); return; }
    setBusy(true); setError("");
    try {
      const db = getFirebase().db; const batch = writeBatch(db); const note = "Crypto installments enabled. Previous demo receipts do not count as received payments.";
      batch.update(doc(db, "orders", orderId), { budgetMinor: total, currency, paymentMode: "crypto", budget: `${currency} ${(total / 100).toFixed(2)}`, update: note, updatedAt: serverTimestamp() });
      batch.set(doc(collection(db, "orders", orderId, "updates")), { status, note, createdAt: serverTimestamp() });
      await batch.commit();
    } catch { setError("Could not enable crypto payments. Check Firebase rules and try again."); }
    finally { setBusy(false); }
  }
  return <form className="order-form contact-form" onSubmit={submit}><h3>Enable crypto on this older order</h3><p className="order-hint">Confirm the actual project budget with the client. Earlier demo receipts will not count as real payments.</p><fieldset disabled={busy}><label>Confirmed project budget<input name="budget" inputMode="decimal" defaultValue={initial ? (initial.total / 100).toFixed(2) : ""} required maxLength={9} /></label><label>Currency<select name="currency" defaultValue={initial?.currency || "USD"}><option>USD</option><option>BDT</option></select></label><button className="button primary">{busy ? "Saving..." : "Enable crypto installments"}</button></fieldset>{error && <p role="alert" className="orders-error">{error}</p>}</form>;
}
export function useWalletSettings() {
  const [state, setState] = useState<{ settings: WalletSettings | null; loading: boolean; error: string }>({ settings: null, loading: true, error: "" });
  useEffect(() => onSnapshot(doc(getFirebase().db, "payment", "binance"), { includeMetadataChanges: true }, snapshot => setState({ settings: snapshot.exists() ? snapshot.data() as WalletSettings : null, loading: snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites, error: "" }), () => setState({ settings: null, loading: false, error: "Wallet settings are unavailable. Please contact Riyad before sending funds." })), []);
  return state;
}
export function CryptoWalletEditor() {
  const { settings, loading, error: readError } = useWalletSettings();
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const next: WalletSettings = { address: String(data.get("address") || "").trim(), trc20Address: String(data.get("trc20Address") || "").trim(), bep20Address: String(data.get("bep20Address") || "").trim(), polygonAddress: String(data.get("polygonAddress") || "").trim(), coin: "USDT", usdRate: 1, bdtRate: Number(data.get("bdtRate") || 0) };
    if (!next.coin || next.usdRate <= 0 || !Number.isFinite(next.usdRate) || next.bdtRate < 0 || !Number.isFinite(next.bdtRate)) { setError("Set the coin and a positive USD price per coin. BDT can be zero to disable BDT payments."); return; }
    if (!CRYPTO_NETWORKS.some(network => walletAddress(next, network))) { setError("Set at least one valid network address."); return; }
    for (const [field, network] of [["trc20Address", "TRC20"], ["bep20Address", "BEP20"], ["polygonAddress", "Polygon"]] as const) if (next[field] && !walletAddress({ ...next, address: "" }, network)) { setError(`Check the ${network} address.`); return; }
    setBusy(true); setError(""); setNotice("");
    try { await setDoc(doc(getFirebase().db, "payment", "binance"), { ...next, updatedAt: serverTimestamp() }); setNotice("Crypto payment settings saved."); }
    catch { setError("Could not save wallet settings. Check Firebase permissions and try again."); }
    finally { setBusy(false); }
  }
  return <details className="connected-editor"><summary>Manage crypto payment addresses</summary><p>Clients read the address from payment/binance. Paste Binance deposit addresses for the exact coin and network. A common 0x address is only used for BEP20 and Polygon; TRC20 requires a TRON address.</p>{loading && <p role="status">Loading wallet settings...</p>}{readError && <p role="alert" className="orders-error">{readError}</p>}{!loading && !readError && <form key={JSON.stringify(settings)} className="contact-form" onSubmit={save}><fieldset disabled={busy}><label>Coin / token<input name="coin" value="USDT" readOnly /></label><label>Common address (optional)<input name="address" defaultValue={settings?.address || ""} placeholder="Common EVM address (0x...)" maxLength={128} /></label>{[["trc20Address", "TRC20 address (TRON)"], ["bep20Address", "BEP20 address override"], ["polygonAddress", "Polygon address override"]].map(([field, label]) => <label key={field}>{label}<input name={field} defaultValue={settings?.[field as keyof WalletSettings] || ""} maxLength={128} /></label>)}<div className="order-form-pair"><label>USD per 1 coin<input name="usdRate" inputMode="decimal" type="number" step="any" min="0.000001" value={1} readOnly /></label><label>BDT per 1 coin (0 disables BDT)<input name="bdtRate" inputMode="decimal" type="number" step="any" min="0" defaultValue={settings?.bdtRate || 0} /></label></div><p className="order-hint">USD budgets are quoted at 1 USD = 1 USDT. BDT uses your configured quote, not a live exchange rate. Only enable networks supported by Binance for the selected token.</p><button className="button primary">{busy ? "Saving..." : "Save crypto settings"}</button></fieldset></form>}{error && <p role="alert" className="orders-error">{error}</p>}{notice && <p role="status">{notice}</p>}</details>;
}

export function CryptoPaymentPlan({ orderId, total, currency, status, admin, uid, clientId }: { orderId: string; total: number; currency: Currency; status: OrderStage; admin: boolean; uid: string; clientId: string }) {
  const wallet = useWalletSettings();
  const [proofs, setProofs] = useState<Evidence[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [selected, setSelected] = useState(0);
  useEffect(() => onSnapshot(collection(getFirebase().db, "orders", orderId, "cryptoPayments"), { includeMetadataChanges: true }, snapshot => {
    // Show only server-confirmed changes; rejected writes must keep the upload form/error visible.
    setProofs(previous => snapshot.docs.map(item => item.metadata.hasPendingWrites ? previous.find(proof => proof.id === item.id) : { ...item.data(), id: item.id } as Evidence).filter((item): item is Evidence => !!item));
    setLoading(snapshot.metadata.fromCache); setError("");
  }, () => { setLoading(false); setError("Payment submissions could not be loaded. Please reload before sending funds."); }), [orderId]);
  const amounts = installments(total);
  const verified = [0, 1, 2].map(index => proofs.some(proof => proof.installment === index && proof.status === "verified"));
  const available = [true, verified[0] && ["Review", "Delivered"].includes(status), verified[0] && verified[1] && status === "Delivered"];
  const evidence = proofs.find(proof => proof.installment === selected);
  return <section className="installment-plan"><h3>Pay by crypto</h3><InstallmentSummary total={total} currency={currency} /><p className="crypto-notice">Send only the displayed token on the selected network. Upload your screenshot and transaction hash after sending. Your payment stays pending until Riyad verifies the transfer.</p>{loading && <p role="status">Loading payments...</p>}{error && <p role="alert" className="orders-error">{error}</p>}<div className="installment-actions">{labels.map((label, index) => <div key={label}><div><strong>{label}</strong><small>{proofs.find(proof => proof.installment === index)?.status || (available[index] ? "Due" : "Waiting for earlier payment / project stage")}</small></div><button className="auth-secondary" aria-pressed={selected === index} disabled={!admin && !available[index]} onClick={() => setSelected(index)}>{admin ? "Review proof" : "View payment"}</button></div>)}</div>
    {!loading && !error && <div className="crypto-checkout"><h3>{labels[selected]} · {money(amounts[selected], currency)}</h3>{evidence ? <><EvidenceCard key={`${evidence.id}:${evidence.status}`} orderId={orderId} evidence={evidence} admin={admin} />{evidence.status === "rejected" && !admin && wallet.settings && available[selected] && <CryptoTransfer settings={wallet.settings} orderId={orderId} index={selected} amountMinor={amounts[selected]} currency={currency} uid={uid} />}</> : admin ? <p>No screenshot submitted yet.</p> : wallet.loading ? <p role="status">Loading the payment address...</p> : wallet.error ? <p role="alert" className="orders-error">{wallet.error}</p> : !wallet.settings ? <p>Crypto payments are not configured yet. Contact Riyad before sending money.</p> : available[selected] && uid === clientId ? <CryptoTransfer key={`${orderId}:${selected}`} settings={wallet.settings} orderId={orderId} index={selected} amountMinor={amounts[selected]} currency={currency} uid={uid} /> : <p>This installment is not due yet.</p>}</div>}
  </section>;
}

export function CryptoTransfer({ settings, orderId, index, amountMinor, currency, uid }: { settings: WalletSettings; orderId: string; index: number; amountMinor: number; currency: Currency; uid: string }) {
  const networks = CRYPTO_NETWORKS.filter(network => walletAddress(settings, network));
  const [network, setNetwork] = useState<CryptoNetwork>(networks[0] || "TRC20"); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [progress, setProgress] = useState(0); const [copyNote, setCopyNote] = useState("");
  const address = walletAddress(settings, network); const quote = cryptoQuote(amountMinor, currency, settings);
  async function copy() { try { await navigator.clipboard.writeText(address); setCopyNote("Address copied."); } catch { setCopyNote("Select the address below and copy it manually."); } }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !file || !address || quote === null) return;
    const txid = String(new FormData(event.currentTarget).get("txid") || "").trim();
    if (!/^(0x)?[a-fA-F0-9]{64}$/.test(txid)) { setError("Enter the blockchain transaction hash (64 hex characters, optionally starting with 0x)."); return; }
    setBusy(true); setError(""); setProgress(0);
    try {
      const { db, storage } = getFirebase(); const uploadId = doc(collection(db, "orders", orderId, "proofUploads")).id; const path = `paymentProofs/${orderId}/${uid}/${index}/${uploadId}/screenshot`;
      const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
      await new Promise<void>((resolve, reject) => task.on("state_changed", snapshot => setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
      await setDoc(doc(db, "orders", orderId, "cryptoPayments", String(index)), { clientId: uid, installment: index, status: "pending", amountMinor, currency, coin: settings.coin, network, address, cryptoAmount: quote, rate: currency === "USD" ? settings.usdRate : settings.bdtRate, txid: txid.toLowerCase().replace(/^0x/, ""), screenshot: { path, name: file.name, size: file.size, type: file.type }, createdAt: serverTimestamp() });
    } catch { setError("Payment proof was not submitted. Keep your screenshot and transaction hash, and retry. Do not send the transfer again."); }
    finally { setBusy(false); }
  }
  if (!networks.length || !address || settings.coin !== "USDT" || settings.usdRate !== 1 || !quote) return <p>Wallet addresses or the conversion rate for {currency} are not configured. Contact Riyad before transferring funds.</p>;
  return <form className="contact-form crypto-transfer" onSubmit={submit}><fieldset disabled={busy}><label>Transfer network<select value={network} onChange={event => { setNetwork(event.target.value as CryptoNetwork); setCopyNote(""); }}>{networks.map(value => <option key={value}>{value}</option>)}</select></label><div className="crypto-amount"><span>Send exactly</span><strong>{quote.toFixed(6)} {settings.coin}</strong><small>Quoted at {currency === "USD" ? settings.usdRate : settings.bdtRate} {currency} per {settings.coin}. Account for withdrawal fees so this amount arrives.</small></div><label>Receiving address ({network})<input value={address} readOnly onFocus={event => event.target.select()} /></label><button className="auth-secondary" type="button" onClick={copy}>Copy address</button>{copyNote && <p role="status">{copyNote}</p>}<label>Transaction hash<input name="txid" required maxLength={66} placeholder="Paste the blockchain transaction hash" /></label><label>Payment screenshot (PNG, JPG or WebP, up to 5 MB)<input type="file" accept="image/png,image/jpeg,image/webp" required onChange={event => { const next = event.target.files?.[0]; if (!next) { setFile(null); return; } if (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || !next.size || next.size > 5 * 1024 * 1024 || next.name.length > 255) { setError("Choose a PNG, JPG or WebP screenshot up to 5 MB."); setFile(null); event.target.value = ""; return; } setFile(next); setError(""); }} /></label>{file && <div className="crypto-proof-preview"><AttachmentPreview key={`${file.name}:${file.lastModified}`} file={file} /></div>}<button className="button primary" disabled={!file}>{busy ? `Uploading ${progress}%...` : "Submit screenshot for verification"}</button></fieldset>{error && <p role="alert" className="orders-error">{error}</p>}</form>;
}

function EvidenceCard({ orderId, evidence, admin }: { orderId: string; evidence: Evidence; admin: boolean }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function review(status: "verified" | "rejected") {
    setBusy(true); setError("");
    try {
      const db = getFirebase().db; const proofRef = doc(db, "orders", orderId, "cryptoPayments", evidence.id);
      if (status === "rejected") await updateDoc(proofRef, { status, reviewedAt: serverTimestamp() });
      else await runTransaction(db, async transaction => {
        const proof = await transaction.get(proofRef);
        const ledgerRef = doc(db, "cryptoTransactions", `${evidence.network}_${evidence.txid}`);
        const ledger = await transaction.get(ledgerRef);
        if (proof.data()?.status !== "pending" || ledger.exists()) throw new Error("already-reviewed");
        transaction.set(ledgerRef, { orderId, installment: evidence.installment, network: evidence.network, txid: evidence.txid, verifiedAt: serverTimestamp() });
        transaction.update(proofRef, { status, reviewedAt: serverTimestamp() });
      });
    }
    catch { setError("Could not verify this submission. Check whether its transaction hash was already verified for another payment, then reload."); }
    finally { setBusy(false); }
  }
  return <div className="crypto-evidence"><p className="crypto-notice">{evidence.status === "pending" ? "Screenshot received. Awaiting transfer verification." : evidence.status === "verified" ? "Transfer verified by Riyad." : "This submission was rejected. Contact Riyad about the reason and upload corrected proof below. Do not resend money."}</p><dl><dt>Amount submitted</dt><dd>{evidence.cryptoAmount} {evidence.coin} · {evidence.network}</dd><dt>Recipient address</dt><dd>{evidence.address}</dd><dt>Transaction hash</dt><dd>{evidence.txid}</dd></dl><ChatAttachment attachment={evidence.screenshot} />{admin && evidence.status === "pending" && <><p className="order-hint">Confirm the transaction hash, received token, network, address and net amount in Binance before verifying. A screenshot alone is not confirmation.</p><div className="auth-actions"><button className="button primary" disabled={busy} onClick={() => review("verified")}>Verify received transfer</button><button className="auth-secondary" disabled={busy} onClick={() => review("rejected")}>Reject proof</button></div></>}{error && <p role="alert" className="orders-error">{error}</p>}</div>;
}
