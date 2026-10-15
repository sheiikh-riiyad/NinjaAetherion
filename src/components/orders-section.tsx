"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where, writeBatch, type Timestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { DemoPayment } from "@/components/demo-payment";
import { InstallmentSummary, OrderPaymentPlan, useInstallmentReceipts } from "@/components/installment-payments";
import { demoAmountMinor } from "@/lib/demo-payment";
import { installmentKey, installments, parseOrderBudget, type Currency } from "@/lib/installments";
import { getFirebase } from "@/lib/firebase";
import { publicWorkUrl } from "@/lib/people";
import { canAdvanceOrder, clientLevel, ORDER_SERVICES, ORDER_STAGES, type OrderStage } from "@/lib/orders";

type Order = { id: string; clientId: string; clientName: string; service: string; title: string; description: string; budget: string; deadline: string; referenceUrl: string; status: OrderStage; update: string; deliveryUrl: string; createdAt: Timestamp | null; updatedAt: Timestamp | null };
type Review = { id: string; clientId: string; clientName: string; workRating: number; websiteRating: number; text: string; public: boolean; createdAt: Timestamp | null };
type Update = { id: string; status: OrderStage; note: string; createdAt: Timestamp | null };
function date(timestamp: Timestamp | null) { return timestamp ? timestamp.toDate().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Saving..."; }

export function OrdersSection() {
  const { user, profile, loading, error, retry } = useAuth();
  return <section className="wrap orders-section">
    {loading ? <p role="status">Opening your orders...</p> : !user ? <div className="orders-welcome"><h2>Your next project starts here.</h2><p>Sign in to create an order and follow its progress.</p><Link className="button primary" href="/account">Sign in / Create account</Link></div> : !profile ? <div><p role="alert">{error || "Your account is not available yet."}</p><button className="auth-secondary" onClick={retry}>Try again</button></div> : <OrderDashboard key={`${user.uid}:${profile.admin}`} uid={user.uid} name={profile.name} admin={profile.admin} />}
    <p className="order-hint">Want to test checkout first? <Link className="text-link" href="/demo-payment">Try a demo payment →</Link></p>
    <PublicReviews />
  </section>;
}

function OrderDashboard({ uid, name, admin }: { uid: string; name: string; admin: boolean }) {
  const [state, setState] = useState<{ orders: Order[]; loading: boolean; error: string }>({ orders: [], loading: true, error: "" });
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("All");
  useEffect(() => {
    const source = collection(getFirebase().db, "orders");
    return onSnapshot(admin ? source : query(source, where("clientId", "==", uid)), snapshot => setState({ orders: snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Order)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)), loading: false, error: "" }), () => setState({ orders: [], loading: false, error: "Unable to load orders. Please check your connection and reload." }));
  }, [uid, admin]);
  const completed = state.orders.filter(order => order.status === "Delivered" && order.clientId === uid).length;
  const level = clientLevel(completed);
  const active = state.orders.find(order => order.id === selected);
  const visible = state.orders.filter(order => filter === "All" || order.status === filter);
  return <>
    <div className="orders-toolbar"><div><p className="eyebrow">{admin ? "PROJECT CONTROL" : "MADE FOR YOU"}</p><h2>{admin ? "Manage orders" : "My orders"}</h2></div>{!admin && <button className="button primary" aria-expanded={create} onClick={() => setCreate(!create)}>{create ? "Close form" : "+ Create order"}</button>}</div>
    {!admin && <div className="client-level"><span className="level-mark" aria-hidden="true">{completed >= 5 ? "III" : completed >= 2 ? "II" : "I"}</span><div><strong>{level.name}</strong><p>{completed} completed project{completed === 1 ? "" : "s"}{level.next ? ` · ${level.remaining} more to become a ${level.next}` : " · Thank you for building with me."}</p><progress value={level.progress} max={100} aria-label="Client level progress" /></div></div>}
    {create && !admin && <CreateOrder uid={uid} name={name} done={id => { setCreate(false); setSelected(id); }} />}
    <div className="filter-row orders-filters" aria-label="Filter orders">{["All", ...ORDER_STAGES].map(stage => <button key={stage} aria-pressed={filter === stage} onClick={() => setFilter(stage)}>{stage}</button>)}</div>
    {state.loading && <p role="status">Loading orders...</p>}{state.error && <p className="orders-error" role="alert">{state.error}</p>}
    {!state.loading && !state.error && !visible.length && <div className="orders-welcome"><h3>{filter === "All" ? "A blank page. A world of possibilities." : `No ${filter.toLowerCase()} orders yet.`}</h3><p>{admin ? "Client requests will appear here." : "Tell me what you would like to build using Create order."}</p></div>}
    <div className="order-cards">{visible.map(order => <button className="order-card" key={order.id} aria-pressed={selected === order.id} onClick={() => setSelected(order.id)}><div><span className="order-service">{order.service}</span><span className={`order-status status-${order.status.toLowerCase()}`}>{order.status}</span></div><h3>{order.title}</h3><p>{admin ? `${order.clientName} · ` : ""}Started {date(order.createdAt)}</p><progress max={4} value={ORDER_STAGES.indexOf(order.status)} aria-label={`${order.status}: stage ${ORDER_STAGES.indexOf(order.status) + 1} of 5`} /><span className="order-card-update">{order.update || "Your request is in. I will review the details soon."}</span><span className="order-card-link">View details →</span></button>)}</div>
    {active && <OrderDetails key={active.id} order={active} admin={admin} uid={uid} close={() => setSelected("")} />}
  </>;
}

function CreateOrder({ uid, name, done }: { uid: string; name: string; done: (id: string) => void }) {
  const [draftId] = useState(() => doc(collection(getFirebase().db, "orders")).id);
  const [budget, setBudget] = useState("10000.00");
  const [currency, setCurrency] = useState<Currency>("BDT");
  const total = demoAmountMinor(budget);
  const validBudget = total !== null && total >= 100;
  const paid = useInstallmentReceipts(draftId, total || 0, currency, uid);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") || "").trim(); const description = String(data.get("description") || "").trim();
    const referenceUrl = String(data.get("referenceUrl") || "").trim();
    if (!validBudget) { setError("Enter a project budget from 1.00 to 999,999.99."); return; }
    if (!paid[0]) { setError("Complete the 20% upfront demo payment before submitting."); return; }
    if (!title || !description) { setError("Enter a title and project description."); return; }
    if (referenceUrl && !publicWorkUrl(referenceUrl)) { setError("Enter a full HTTP or HTTPS reference URL."); return; }
    setBusy(true); setError("");
    try {
      const reference = doc(getFirebase().db, "orders", draftId);
      await setDoc(reference, { clientId: uid, clientName: name || "Client", service: String(data.get("service")), title, description, budget: `${currency} ${(total! / 100).toFixed(2)}`, deadline: String(data.get("deadline") || ""), referenceUrl, status: "Requested", update: "", deliveryUrl: "", createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      done(reference.id);
    } catch { setError("Your order was not submitted. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="order-form"><form id={`create-order-${draftId}`} className="contact-form" onSubmit={submit}><h3>Tell me about your project</h3><fieldset disabled={busy}>
    <label>Service<select name="service">{ORDER_SERVICES.map(service => <option key={service}>{service}</option>)}</select></label>
    <label>Project title<input name="title" required maxLength={150} placeholder="E.g. A website for my business" /></label>
    <label>What would you like to build?<textarea name="description" required maxLength={4000} rows={4} placeholder="Goals, pages, features, and anything else I should know." /></label>
    <div className="order-form-pair"><label>Project budget<input name="budget" inputMode="decimal" value={budget} onChange={event => setBudget(event.target.value)} required maxLength={9} /></label><label>Currency<select value={currency} onChange={event => setCurrency(event.target.value as Currency)}><option>BDT</option><option>USD</option></select></label></div>
    <label>Preferred deadline (optional)<input type="date" name="deadline" /></label>
    <label>Reference link (optional)<input type="url" name="referenceUrl" maxLength={2000} placeholder="https://..." /></label>
    <p className="order-hint">You can send reference files and images through the project chat after submitting.</p>
  </fieldset></form>
    {validBudget ? <><InstallmentSummary total={total!} currency={currency} /><div className="demo-payment-notice">Complete the 20% deposit simulation to submit this test order. No real money is collected.</div>{paid[0] ? <p className="profile-success" role="status">20% upfront demo payment complete. You can submit your order.</p> : !busy && <DemoPayment key={installmentKey(draftId, 0, total!, currency)} orderId={installmentKey(draftId, 0, total!, currency)} title="New project - 20% upfront deposit" ownerKey={uid} fixedAmountMinor={installments(total!)[0]} fixedCurrency={currency} />}</> : <p className="orders-error">Enter a numeric budget of at least 1.00 to see your payment plan.</p>}
    <button form={`create-order-${draftId}`} className="button primary" disabled={busy || !validBudget || !paid[0]}>{busy ? "Submitting..." : "Submit order after demo deposit"}</button>
    {error && <p className="orders-error" role="alert">{error}</p>}</section>;
}

function OrderDetails({ order, admin, uid, close }: { order: Order; admin: boolean; uid: string; close: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);
  const [tab, setTab] = useState("Overview");
  const [updates, setUpdates] = useState<Update[]>([]);
  const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(getFirebase().db, "orders", order.id, "updates"), orderBy("createdAt", "asc")), snapshot => { setUpdates(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Update))); setError(""); }, () => setError("Project updates could not be loaded.")), [order.id]);
  const paymentBudget = parseOrderBudget(order.budget);
  const chatHref = admin ? `/messages?client=${encodeURIComponent(order.clientId)}` : "/messages";
  return <section ref={panel} className="order-detail" aria-label={`Order details: ${order.title}`}>
    <header><div><p className="eyebrow">ORDER #{order.id.slice(-8).toUpperCase()}</p><h2>{order.title}</h2><p>{order.clientName} · {order.service}</p></div><button className="auth-secondary" onClick={close}>Close details</button></header>
    <ol className="order-timeline" aria-label="Project stages">{ORDER_STAGES.map((stage, index) => <li key={stage} className={index <= ORDER_STAGES.indexOf(order.status) ? "is-complete" : ""} aria-current={stage === order.status ? "step" : undefined}><span>{index < ORDER_STAGES.indexOf(order.status) ? "✓" : index + 1}</span>{stage}</li>)}</ol>
    <div className="filter-row" aria-label="Order detail tabs">{["Overview", "Progress", "Files", "Messages", "Payments"].map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value}</button>)}</div>
    {tab === "Payments" && (paymentBudget ? <OrderPaymentPlan orderId={order.id} title={order.title} total={paymentBudget.total} currency={paymentBudget.currency} ownerKey={uid} status={order.status} admin={admin} /> : <div className="order-latest"><h3>Budget not set for installments</h3><p>This older order needs a numeric budget with a currency before a payment plan can be calculated. Ask Riyad to confirm the project budget.</p></div>)}
    {tab === "Overview" && <div className="order-overview"><p>{order.description}</p><dl><div><dt>Budget</dt><dd>{order.budget || "To be discussed"}</dd></div><div><dt>Preferred deadline</dt><dd>{order.deadline || "Flexible"}</dd></div><div><dt>Requested</dt><dd>{date(order.createdAt)}</dd></div></dl>{publicWorkUrl(order.referenceUrl) && <a className="text-link" href={publicWorkUrl(order.referenceUrl)} target="_blank" rel="noopener noreferrer">Open reference ↗</a>}<div className="order-latest"><strong>Latest update</strong><p>{order.update || "Your request is waiting for review."}</p></div></div>}
    {tab === "Progress" && <div className="order-updates"><article><time>{date(order.createdAt)}</time><h3>Requested</h3><p>Your project request was submitted.</p></article>{updates.map(update => <article key={update.id}><time>{date(update.createdAt)}</time><h3>{update.status}</h3><p>{update.note}</p></article>)}{error && <p role="alert" className="orders-error">{error}</p>}</div>}
    {tab === "Files" && <div className="order-latest"><h3>Previews & delivery</h3>{publicWorkUrl(order.deliveryUrl) ? <a className="button primary" href={publicWorkUrl(order.deliveryUrl)} target="_blank" rel="noopener noreferrer">Open project / delivery ↗</a> : <p>Your project link will appear here when it is ready.</p>}<p>Share and download project files in your conversation with Riyad.</p><Link className="auth-secondary" href={chatHref}>Open file sharing</Link></div>}
    {tab === "Messages" && <div className="order-latest"><h3>Let&apos;s talk about your project</h3><p>Send the order number with your message so we can keep the conversation clear.</p><Link className="button primary" href={chatHref}>Chat with {admin ? order.clientName : "Riyad"}</Link></div>}
    {admin && <AdminOrderUpdate key={`${order.id}:${order.updatedAt?.toMillis() || 0}`} order={order} />}
    {order.status === "Delivered" && <OrderReview order={order} canReview={!admin && order.clientId === uid} />}
  </section>;
}

function AdminOrderUpdate({ order }: { order: Order }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); const deliveryUrl = String(data.get("deliveryUrl") || "").trim(); const note = String(data.get("note") || "").trim();
    if (!note) { setError("Write an update for the client."); return; }
    if (!canAdvanceOrder(order.status, String(data.get("status")))) { setError("Choose the current stage or the next stage."); return; }
    if (deliveryUrl && !publicWorkUrl(deliveryUrl)) { setError("Use a full HTTP or HTTPS project URL."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const db = getFirebase().db; const batch = writeBatch(db); const status = String(data.get("status"));
      batch.update(doc(db, "orders", order.id), { status, update: note, deliveryUrl, updatedAt: serverTimestamp() });
      batch.set(doc(collection(db, "orders", order.id, "updates")), { status, note, createdAt: serverTimestamp() });
      await batch.commit(); setNotice("Project updated.");
    } catch { setError("Update was not saved. Reload the order and try again."); }
    finally { setBusy(false); }
  }
  const next = ORDER_STAGES[ORDER_STAGES.indexOf(order.status) + 1];
  return <form className="order-form contact-form" onSubmit={save}><h3>Update this project</h3><fieldset disabled={busy}><label>Stage<select name="status" defaultValue={order.status}><option>{order.status}</option>{next && <option>{next}</option>}</select></label><label>Update for the client<textarea name="note" required maxLength={2000} rows={3} placeholder="What is finished? What happens next?" /></label><label>Preview / delivery URL (optional)<input type="url" name="deliveryUrl" defaultValue={order.deliveryUrl} maxLength={2000} placeholder="https://..." /></label><button className="button primary">{busy ? "Saving..." : "Post update"}</button></fieldset>{error && <p className="orders-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}</form>;
}

function OrderReview({ order, canReview }: { order: Order; canReview: boolean }) {
  const [state, setState] = useState<{ loading: boolean; review: Review | null; error: string }>({ loading: true, review: null, error: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => onSnapshot(doc(getFirebase().db, "orderReviews", order.id), snapshot => setState({ loading: false, review: snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } as Review : null, error: "" }), () => setState({ loading: false, review: null, error: "Unable to load this review." })), [order.id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget); const text = String(data.get("text") || "").trim();
    if (!text) { setError("Please write a short review."); return; }
    setBusy(true); setError("");
    try { await setDoc(doc(getFirebase().db, "orderReviews", order.id), { clientId: order.clientId, clientName: order.clientName, workRating: Number(data.get("workRating")), websiteRating: Number(data.get("websiteRating")), text, public: data.get("public") === "on", createdAt: serverTimestamp() }); }
    catch { setError("Your review was not saved. Please try again."); }
    finally { setBusy(false); }
  }
  if (state.loading) return <p role="status">Loading review...</p>;
  if (state.error) return <p role="alert" className="orders-error">{state.error}</p>;
  if (state.review) return <div className="order-latest"><h3>{canReview ? "Thank you for your review!" : "Client review"}</h3><ReviewCard review={state.review} /></div>;
  if (!canReview) return <p className="order-hint">The client can now leave a review.</p>;
  return <form className="order-form contact-form" onSubmit={submit}><h3>How was your experience?</h3><fieldset disabled={busy}><div className="order-form-pair">{[["workRating", "Quality of my work"], ["websiteRating", "Website experience"]].map(([field, label]) => <label key={field}>{label}<select name={field} defaultValue="5">{[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} / 5</option>)}</select></label>)}</div><label>Your review<textarea name="text" required maxLength={2000} rows={3} /></label><label className="review-consent"><input type="checkbox" name="public" />Show my name and review publicly on this website</label><button className="button primary">{busy ? "Sending..." : "Send review"}</button></fieldset>{error && <p className="orders-error" role="alert">{error}</p>}</form>;
}

function ReviewCard({ review }: { review: Review }) {
  return <article className="review-card"><div><strong>{review.clientName}</strong><time>{date(review.createdAt)}</time></div><p className="review-ratings">Work {review.workRating}/5 · Website {review.websiteRating}/5</p><p>{review.text}</p></article>;
}
function PublicReviews() {
  const [reviews, setReviews] = useState<Review[]>([]); const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(getFirebase().db, "orderReviews"), where("public", "==", true), limit(20)), snapshot => { setReviews(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Review)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))); setError(""); }, () => setError("Client reviews could not be loaded.")), []);
  return <section className="public-reviews"><p className="eyebrow">WORDS FROM CLIENTS</p><h2>A little feedback.<br />A lot of meaning.</h2>{error && <p className="orders-error" role="alert">{error}</p>}{!reviews.length && !error && <p>Public reviews will appear here after projects are delivered.</p>}<div className="reviews-grid">{reviews.map(review => <ReviewCard key={review.id} review={review} />)}</div></section>;
}
