"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, runTransaction, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { AccountChat } from "@/components/account-chat";
import { PeerUnreadBadge } from "@/components/unread-provider";
import { getFirebase } from "@/lib/firebase";
import { peerChatId, publicWorkUrl, type ConnectedPerson, type PeerThread } from "@/lib/people";

export function ConnectedPeople() {
  const { user, profile } = useAuth();
  const [directory, setDirectory] = useState<{ people: ConnectedPerson[]; loading: boolean; error: string }>({ people: [], loading: true, error: "" });
  useEffect(() => onSnapshot(collection(getFirebase().db, "connectedPeople"), snapshot => {
    setDirectory({ people: snapshot.docs.map(item => ({ uid: item.id, ...item.data() } as ConnectedPerson)).sort((a, b) => a.name.localeCompare(b.name)), loading: false, error: "" });
  }, () => setDirectory({ people: [], loading: false, error: "The people list could not be loaded. Please reload and try again." })), []);

  return <section className="wrap connected-section">
    {profile?.admin && <DirectoryEditor key={`editor:${user!.uid}`} people={directory.people} />}
    {directory.loading && <p role="status">Loading connected people...</p>}
    {directory.error && <p role="alert" className="auth-error">{directory.error}</p>}
    {!directory.loading && !directory.error && !directory.people.length && <div className="connected-empty"><h2>Our circle is growing.</h2><p>Connected clients and their work will appear here soon.</p></div>}
    {user && profile ? <PeopleCommunity key={`community:${user.uid}`} uid={user.uid} name={profile.name} people={directory.people} /> : <>
      <PeopleList people={directory.people} />
      <p className="connected-signin"><Link href="/account">Sign in or create an account</Link> to chat with connected clients.</p>
    </>}
  </section>;
}

function PeopleList({ people, uid, open, busy }: { people: ConnectedPerson[]; uid?: string; open?: (person: ConnectedPerson) => void; busy?: boolean }) {
  return <ul className="connected-list" aria-label="Connected clients">{people.map(person => <li key={person.uid}>
    <span className="messenger-avatar" aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
    <div className="connected-person"><h2>{person.name}</h2><h3>{person.workTitle}</h3><p>{person.workDescription}</p>{publicWorkUrl(person.workUrl) && <a className="text-link" href={publicWorkUrl(person.workUrl)} target="_blank" rel="noopener noreferrer">View work ↗</a>}</div>
    {open && person.uid !== uid && <button className="auth-secondary" disabled={busy} onClick={() => open(person)}>Chat <PeerUnreadBadge peerChatId={peerChatId(uid!, person.uid)} /></button>}
    {person.uid === uid && <span className="connected-you">You</span>}
  </li>)}</ul>;
}

function PeopleCommunity({ uid, name, people }: { uid: string; name: string; people: ConnectedPerson[] }) {
  const [inbox, setInbox] = useState<PeerThread[]>([]);
  const [inboxError, setInboxError] = useState("");
  const [active, setActive] = useState<{ id: string; uid: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chatPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (active) chatPanel.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [active]);
  useEffect(() => onSnapshot(query(collection(getFirebase().db, "peerChats"), where("members", "array-contains", uid)), snapshot => {
    setInbox(snapshot.docs.map(item => ({ id: item.id, members: item.data().members, names: item.data().names })));
    setInboxError("");
  }, () => { setInbox([]); setInboxError("Your client conversations could not be loaded. Please reload and try again."); }), [uid]);

  async function open(person: ConnectedPerson) {
    if (busy || person.uid === uid) return;
    setBusy(true); setError("");
    const id = peerChatId(uid, person.uid);
    try {
      const reference = doc(getFirebase().db, "peerChats", id);
      await runTransaction(getFirebase().db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) transaction.set(reference, { members: [uid, person.uid], names: [name || "Client", person.name], createdAt: serverTimestamp() });
      });
      setActive({ id, uid: person.uid, name: person.name });
    } catch { setError("Unable to start this chat. Please try again after the connection is restored."); }
    finally { setBusy(false); }
  }

  return <>
    <PeopleList people={people} uid={uid} open={open} busy={busy} />
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div ref={chatPanel} className={`connected-chat${active ? " connected-chat-open" : ""}`}>
      <aside className="connected-inbox"><h2>Client conversations <PeerUnreadBadge /></h2><p>Private messages between you and other clients.</p>
        {inboxError && <p className="auth-error" role="alert">{inboxError}</p>}
        {!inbox.length && !inboxError && <p>Choose someone above to say hello.</p>}
        {inbox.map(thread => { const index = thread.members.findIndex(member => member !== uid); const other = thread.members[index]; const label = people.find(person => person.uid === other)?.name || thread.names[index]; return <button key={thread.id} aria-pressed={active?.id === thread.id} onClick={() => setActive({ id: thread.id, uid: other, name: label })}><span className="messenger-avatar" aria-hidden="true">{label.slice(0, 1).toUpperCase()}</span><span>{label}</span><PeerUnreadBadge peerChatId={thread.id} /></button>; })}
      </aside>
      {active ? <AccountChat key={active.id} clientId={active.uid} clientName={active.name} peerChatId={active.id} onBack={() => setActive(null)} /> : <div className="connected-chat-empty"><h2>A new connection starts<br />with a hello.</h2><p>Select a client or continue a conversation.</p></div>}
    </div>
  </>;
}

function DirectoryEditor({ people }: { people: ConnectedPerson[] }) {
  const [accounts, setAccounts] = useState<{ uid: string; name: string; email: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => onSnapshot(collection(getFirebase().db, "users"), snapshot => setAccounts(snapshot.docs.filter(item => item.data().admin !== true).map(item => ({ uid: item.id, name: item.data().name, email: item.data().email }))), () => setError("Unable to load clients for publishing.")), []);
  const existing = people.find(person => person.uid === selected);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected || busy) return;
    const data = new FormData(event.currentTarget);
    const workUrl = String(data.get("workUrl") || "").trim();
    const publicName = String(data.get("name") || "").trim();
    const workTitle = String(data.get("workTitle") || "").trim();
    const workDescription = String(data.get("workDescription") || "").trim();
    if (!publicName || !workTitle) { setError("Enter a public name and work title."); return; }
    if (workUrl && !publicWorkUrl(workUrl)) { setError("Use a full http:// or https:// work URL."); return; }
    setBusy(true); setError(""); setNotice("");
    try { await setDoc(doc(getFirebase().db, "connectedPeople", selected), { name: publicName, workTitle, workDescription, workUrl, updatedAt: serverTimestamp() }); setNotice("Client listing published."); }
    catch { setError("Unable to publish this listing. Please check the connection and try again."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!selected || busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await deleteDoc(doc(getFirebase().db, "connectedPeople", selected)); setNotice("Client removed from the public list. Existing chats remain available."); }
    catch { setError("Unable to remove this listing. Please try again."); }
    finally { setBusy(false); }
  }
  return <details className="connected-editor"><summary>Manage connected clients</summary><p>Choose which clients and work to publish. Names and work details below are visible to everyone.</p>
    <label>Client<select value={selected} disabled={busy} onChange={event => { setSelected(event.target.value); setError(""); setNotice(""); }}><option value="">Select a client</option>{accounts.map(account => <option key={account.uid} value={account.uid}>{account.name || account.email}{people.some(person => person.uid === account.uid) ? " (Published)" : ""}</option>)}</select></label>
    {selected && <form key={`${selected}:${existing?.name ?? ""}:${existing?.workTitle ?? ""}:${existing?.workDescription ?? ""}:${existing?.workUrl ?? ""}`} className="contact-form" onSubmit={save}><fieldset disabled={busy}>
      <label>Public name<input name="name" defaultValue={existing?.name || accounts.find(account => account.uid === selected)?.name || ""} required maxLength={100} /></label>
      <label>Work title<input name="workTitle" defaultValue={existing?.workTitle || ""} placeholder="E.g. Business website" required maxLength={150} /></label>
      <label>About their work<textarea name="workDescription" defaultValue={existing?.workDescription || ""} maxLength={1000} rows={3} /></label>
      <label>Work URL (optional)<input name="workUrl" type="url" defaultValue={existing?.workUrl || ""} placeholder="https://..." maxLength={2000} /></label>
      <div className="auth-actions"><button className="button primary">{busy ? "Saving..." : existing ? "Update listing" : "Publish client"}</button>{existing && <button className="auth-secondary" type="button" onClick={remove}>Remove listing</button>}</div>
    </fieldset></form>}
    {error && <p className="auth-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
  </details>;
}
