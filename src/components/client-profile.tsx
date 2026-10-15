"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { collection, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { getFirebase } from "@/lib/firebase";
import { clientLevel, ORDER_STAGES, type OrderStage } from "@/lib/orders";
import { useUnread } from "@/components/unread-provider";

type Project = { id: string; title: string; service: string; status: OrderStage; createdAt: Timestamp | null };
type Props = { user: User; name: string; busy: boolean; notice: string; failure: string; authError: string; saveName: (event: FormEvent<HTMLFormElement>) => Promise<void>; logout: () => Promise<void>; retry: () => void };

export function ClientProfile({ user, name, busy, notice, failure, authError, saveName, logout, retry }: Props) {
  const [tab, setTab] = useState<"overview" | "settings">("overview");
  const [attempt, setAttempt] = useState(0);
  const [projects, setProjects] = useState<{ items: Project[]; loading: boolean; error: string }>({ items: [], loading: true, error: "" });
  const [reset, setReset] = useState({ busy: false, message: "", error: "" });
  const { total: unread, error: unreadError } = useUnread();
  const initials = (name || user.email || "Client").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const joined = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "";
  const hasPassword = user.providerData.some(provider => provider.providerId === "password");
  const hasGoogle = user.providerData.some(provider => provider.providerId === "google.com");

  useEffect(() => onSnapshot(query(collection(getFirebase().db, "orders"), where("clientId", "==", user.uid)), snapshot => {
    setProjects({ items: snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Project)).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)), loading: false, error: "" });
  }, () => setProjects({ items: [], loading: false, error: "Project activity is unavailable right now." })), [user.uid, attempt]);

  const completed = projects.items.filter(project => project.status === "Delivered").length;
  const active = projects.items.length - completed;
  const level = clientLevel(completed);
  const ready = !projects.loading && !projects.error;
  async function resetPassword() {
    if (!user.email || reset.busy) return;
    setReset({ busy: true, message: "", error: "" });
    try { await sendPasswordResetEmail(getFirebase().auth, user.email); setReset({ busy: false, message: "Password reset email sent. Check your inbox to continue.", error: "" }); }
    catch { setReset({ busy: false, message: "", error: "Could not send the reset email. Please try again later." }); }
  }

  return <section className="wrap client-profile" aria-label="Client profile">
    <div className="profile-cover"><span className="profile-cover-word" aria-hidden="true">CREATE. CONNECT. GROW.</span><span className="profile-cover-orbit" aria-hidden="true" /><p>YOUR CLIENT WORKSPACE <span>01 / AETHERION</span></p></div>
    <header className="profile-identity"><div className="profile-avatar" aria-hidden="true">{initials}<span /></div><div className="profile-identity-copy"><span className="profile-role">CLIENT ACCOUNT</span><h1>{name || "Your profile"}</h1><p>{user.email}</p><span className="profile-joined">{joined ? `Member since ${joined}` : "Your space to build something great"}</span></div><Link className="button primary" href="/orders">Start a project <span aria-hidden="true">↗</span></Link></header>
    <div className="profile-tabs" aria-label="Profile views">{(["overview", "settings"] as const).map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{value === "overview" ? "Overview" : "Profile & security"}</button>)}<button className="profile-signout" disabled={busy} onClick={logout}>Sign out ↗</button></div>
    {(failure || authError) && <div className="profile-feedback" role="alert">{failure || authError}{authError && <button className="auth-secondary" onClick={retry}>Reconnect account</button>}</div>}
    {notice && <p className="profile-success" role="status">{notice}</p>}
    {tab === "overview" ? <>
      <div className="profile-metrics" aria-label="Account activity">{[["Total projects", ready ? projects.items.length : "—", "Your ideas, in motion"], ["In progress", ready ? active : "—", "From request to final review"], ["Completed", ready ? completed : "—", "Delivered with care"]].map(([label, value, description]) => <div key={label}><p>{label}</p><strong>{value}</strong><span>{description}</span></div>)}<Link href="/messages"><p>Unread messages</p><strong>{unreadError ? "—" : unread}</strong><span>Open your conversation ↗</span></Link></div>
      <div className="profile-grid"><div className="profile-main"><section className="profile-panel"><div className="profile-panel-title"><div><p className="eyebrow">LET&apos;S KEEP BUILDING</p><h2>Your projects</h2></div><Link href="/orders">View all ↗</Link></div>
        {projects.loading && <p role="status" className="profile-muted">Loading project activity...</p>}
        {projects.error && <div className="profile-feedback" role="alert">{projects.error}<button className="auth-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div>}
        {ready && !projects.items.length && <div className="profile-empty"><span aria-hidden="true">↗</span><h3>A great project starts with an idea.</h3><p>Share yours. I&apos;ll help you bring it to life, one milestone at a time.</p><Link className="auth-secondary" href="/orders">Create your first order</Link></div>}
        <div className="profile-projects">{projects.items.slice(0, 3).map(project => <article key={project.id}><div><span className="profile-project-symbol" aria-hidden="true">{project.service === "Website" ? "W" : project.service === "Redesign" ? "R" : "P"}</span><div><h3>{project.title}</h3><p>{project.service} · #{project.id.slice(-8).toUpperCase()}</p></div><span className={`order-status status-${project.status.toLowerCase()}`}>{project.status}</span></div><progress max={4} value={ORDER_STAGES.indexOf(project.status)} aria-label={`${project.title}: ${project.status}`} /></article>)}</div>
      </section><section className="profile-connect"><div><p className="eyebrow">GOOD PEOPLE. GREAT POSSIBILITIES.</p><h2>Build your circle.</h2><p>Meet connected clients, explore their work, and start a conversation.</p><Link href="/people" className="text-link">Explore connected people ↗</Link></div><span aria-hidden="true">↗</span></section></div>
      <aside className="profile-side"><section className="profile-panel profile-membership"><p className="eyebrow">GROW WITH EVERY PROJECT</p><span className="profile-level-icon" aria-hidden="true">{ready ? completed >= 5 ? "III" : completed >= 2 ? "II" : "I" : "·"}</span><h2>{ready ? level.name : "Your client level"}</h2><p>{ready ? level.next ? `${level.remaining} more completed project${level.remaining === 1 ? "" : "s"} to ${level.next}.` : "Thank you for trusting me with your ideas." : "Your level is based on delivered projects."}</p>{ready && <><progress max={100} value={level.progress} aria-label="Progress toward next client level" /><div className="profile-level-caption"><span>{completed} delivered</span><span>{level.next || "Highest level"}</span></div></>}<div className="profile-level-tiers"><span>01 New Client</span><span>02 Returning Client <small>2 projects</small></span><span>03 Trusted Partner <small>5 projects</small></span></div></section>
      <section className="profile-panel profile-support"><span className="profile-support-dot" /> <h3>A direct line to Riyad.</h3><p>Questions, feedback, or a new idea? Your conversation is always a click away.</p><Link className="button primary" href="/messages">Open messages ↗</Link>{unreadError && <p className="profile-muted">Unread counts are temporarily unavailable.</p>}</section></aside></div>
    </> : <div className="profile-grid"><section className="profile-panel"><div className="profile-panel-title"><div><p className="eyebrow">THE DETAILS THAT MAKE YOU, YOU</p><h2>Personal information</h2></div></div><form className="contact-form profile-form" onSubmit={saveName}><fieldset disabled={busy}><label>Full name<input key={name} name="name" defaultValue={name || user.displayName || ""} required maxLength={100} autoComplete="name" /></label><label>Email address<input value={user.email || ""} readOnly type="email" autoComplete="email" /><span>Your email is managed by your sign-in account.</span></label><button className="button primary">{busy ? "Saving..." : "Save changes"}</button></fieldset></form></section>
      <aside className="profile-side"><section className="profile-panel"><p className="eyebrow">ACCOUNT ACCESS</p><h2>Sign-in & security</h2><div className="profile-security-row"><span>Sign-in method</span><strong>{[hasGoogle && "Google", hasPassword && "Email & password"].filter(Boolean).join(" + ") || "Connected account"}</strong></div><div className="profile-security-row"><span>Email status</span><strong>{user.emailVerified ? "Verified" : "Not verified"}</strong></div>{hasPassword ? <><p className="profile-muted">Update your password through a secure email link.</p><button className="auth-secondary" disabled={busy || reset.busy} onClick={resetPassword}>{reset.busy ? "Sending..." : "Send password reset email"}</button></> : <p className="profile-muted">Manage your sign-in security through your Google account.</p>}{reset.message && <p role="status" className="profile-success">{reset.message}</p>}{reset.error && <p role="alert" className="profile-feedback">{reset.error}</p>}</section><section className="profile-panel"><h3>Your account stays yours.</h3><p className="profile-muted">Your email and order details are visible to you and the site administrator. Public client listings are managed separately.</p></section></aside></div>}
  </section>;
}
