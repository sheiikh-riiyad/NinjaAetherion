"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { doc, setDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getFirebase } from "@/lib/firebase";
import { markChatRead, UnreadBadge, useUnread } from "@/components/unread-provider";
import { ref, uploadBytesResumable } from "firebase/storage";
import { ChatAttachment, AttachmentPreview, type Attachment, MAX_ATTACHMENT_SIZE } from "@/components/chat-attachment";
import { PresenceStatus } from "@/components/presence-provider";

type Account = { uid: string; name: string; email: string; admin: boolean };
type Reply = { messageId: string; text: string; senderId: string };
type Message = { id: string; text: string; senderId: string; createdAt: Timestamp | null; pending: boolean; attachment?: Attachment; reply?: Reply };

export function AccountChat({ clientId, clientName, onBack, peerChatId }: { clientId: string; clientName: string; onBack?: () => void; peerChatId?: string }) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const filePicker = useRef<HTMLInputElement>(null);
  const mediaPicker = useRef<HTMLInputElement>(null);
  function selectFile(selected?: File) {
    if (!selected || sending) return;
    if (!selected.size || selected.size > MAX_ATTACHMENT_SIZE) { setSendError("Choose a nonempty file up to 20 MB."); return; }
    if (selected.name.length > 255) { setSendError("Please shorten the file name to 255 characters."); return; }
    setFile(selected); setSendError(""); composer.current?.focus();
  }
  const composer = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [readError, setReadError] = useState("");
  const [sendError, setSendError] = useState("");
  const [receiptError, setReceiptError] = useState("");
  const messageList = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !profile || (!peerChatId && !profile.admin && clientId !== user.uid)) return;
    const messagesQuery = query(peerChatId ? collection(getFirebase().db, "peerChats", peerChatId, "messages") : collection(getFirebase().db, "users", clientId, "messages"), orderBy("createdAt", "desc"), limit(100));
    return onSnapshot(messagesQuery, { includeMetadataChanges: true }, snapshot => {
      setMessages(snapshot.docs.map(document => ({
        id: document.id,
        text: String(document.data().text ?? ""),
        senderId: String(document.data().senderId ?? ""),
        createdAt: document.data({ serverTimestamps: "estimate" }).createdAt ?? null,
        pending: document.metadata.hasPendingWrites,
        reply: document.data().reply,
        attachment: document.data().attachment,
      })).reverse());
      setLoading(false);
      setReadError("");
    }, () => {
      setMessages([]);
      setLoading(false);
      setReadError("Unable to load this conversation. Please try reloading the page.");
    });
  }, [clientId, user, profile, peerChatId]);

  useEffect(() => { const list = messageList.current; if (list) list.scrollTop = list.scrollHeight; }, [messages]);

  useEffect(() => {
    const latest = messages.filter(message => !message.pending && message.createdAt).at(-1)?.createdAt;
    if (!user || !latest || loading || readError) return;
    let alive = true;
    function markVisible() {
      if (document.visibilityState !== "visible" || !document.hasFocus() || !messageList.current?.getClientRects().length) return;
      void markChatRead(clientId, user!.uid, latest!, peerChatId).then(() => { if (alive) setReceiptError(""); }).catch(() => { if (alive) setReceiptError("Unable to mark messages as read. Reopen the chat to try again."); });
    }
    markVisible();
    document.addEventListener("visibilitychange", markVisible);
    window.addEventListener("focus", markVisible);
    return () => { alive = false; document.removeEventListener("visibilitychange", markVisible); window.removeEventListener("focus", markVisible); };
  }, [messages, user, clientId, loading, readError, peerChatId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = text.trim();
    if (!user || !profile || sending || loading || !!readError || (!message && !file) || message.length > 2000) return;
    setSending(true); setSendError("");
    try {
      const { db, storage } = getFirebase();
      const messageRef = doc(peerChatId ? collection(db, "peerChats", peerChatId, "messages") : collection(db, "users", clientId, "messages"));
      let attachment: Attachment | undefined;
      if (file) {
        const path = `${peerChatId ? `peer/${peerChatId}` : `chat/${clientId}`}/${user.uid}/${messageRef.id}/attachment`;
        setProgress(0);
        const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type || "application/octet-stream" });
        await new Promise<void>((resolve, reject) => task.on("state_changed", snapshot => setProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
        attachment = { path, name: file.name, size: file.size, type: file.type || "application/octet-stream" };
      }
      await setDoc(messageRef, {
        text: message, senderId: user.uid, createdAt: serverTimestamp(),
        ...(replyTo ? { reply: replyTo } : {}),
        ...(attachment ? { attachment } : {}),
      });
      setText("");
      setFile(null);
      setReplyTo(null);
    } catch { setSendError("Your message was not sent. Check your connection and Firebase Storage setup, then try again."); }
    finally { setSending(false); }
  }

  if (!user || !profile || (!peerChatId && !profile.admin && clientId !== user.uid)) return null;

  return <section className="messenger-thread" aria-label={`Chat with ${clientName}`}>
    <header className="messenger-thread-header">
      {onBack && <button className="messenger-back" aria-label="Back to conversations" onClick={onBack}>←</button>}
      <span className="messenger-avatar" aria-hidden="true">{clientName.slice(0, 1).toUpperCase()}</span>
      <div><h2>{clientName}</h2><p>{peerChatId ? "Client conversation" : <PresenceStatus uid={profile.admin ? clientId : undefined} />}</p></div>
      <span className="messenger-header-note">PRIVATE CHAT</span>
    </header>
    <div ref={messageList} className="messenger-messages" role="log" aria-label="Messages" aria-live="polite" aria-busy={loading}>
      {loading && <p role="status">Loading conversation…</p>}
      {!loading && !readError && !messages.length && <div className="messenger-welcome"><span className="messenger-avatar" aria-hidden="true">{clientName.slice(0, 1).toUpperCase()}</span><h3>Say hello to {clientName.split(" ")[0]}.</h3><p>A good conversation is the start of something great.<br />Send the first message below.</p></div>}
      {messages.map(message => <article key={message.id} className={`messenger-message${message.senderId === user.uid ? " messenger-mine" : ""}`}>
        <span className="sr-only">{message.senderId === user.uid ? "You" : clientName}</span>
        {message.reply && <blockquote className="messenger-quote"><span>↩ {message.reply.senderId === user.uid ? "You" : clientName}</span><p>{message.reply.text || "Attachment"}</p></blockquote>}
        {message.attachment && <ChatAttachment attachment={message.attachment} />}
        {message.text && <p>{message.text}</p>}
        <div className="messenger-message-meta"><small>{message.pending ? "Sending…" : message.createdAt ? <time dateTime={message.createdAt.toDate().toISOString()} title={message.createdAt.toDate().toLocaleString()}>{message.createdAt.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : ""}</small><button type="button" className="messenger-reply-action" disabled={message.pending || sending || !!readError} aria-label={`Reply to ${message.senderId === user.uid ? "your message" : clientName + "’s message"}: ${message.text.slice(0, 80)}`} onClick={() => { setReplyTo({ messageId: message.id, text: message.text, senderId: message.senderId }); composer.current?.focus(); }}>↩ Reply</button></div>
      </article>)}
    </div>
    {(readError || sendError || receiptError) && <p role="alert" className="messenger-error">{readError || sendError || receiptError}</p>}
    {replyTo && <div className="messenger-reply-preview" role="status"><div><strong>Replying to {replyTo.senderId === user.uid ? "yourself" : clientName}</strong><p>{replyTo.text || "Attachment"}</p></div><button type="button" aria-label="Cancel reply" disabled={sending} onClick={() => { setReplyTo(null); composer.current?.focus(); }}>×</button></div>}
    {file && <div className="messenger-attachment-preview"><AttachmentPreview file={file} /><span>{file.name}<small>{(file.size / 1024 / 1024).toFixed(2)} MB{sending ? ` - Uploading ${progress}%` : " - Ready to send"}</small></span><button type="button" disabled={sending} aria-label="Remove attachment" onClick={() => setFile(null)}>x</button></div>}
    <form className="messenger-composer" onSubmit={send}>
      <input ref={filePicker} type="file" hidden disabled={sending || loading || !!readError} onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
      <input ref={mediaPicker} type="file" accept="image/*,video/*" hidden disabled={sending || loading || !!readError} onChange={event => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
      <button className="messenger-attach-button" type="button" title="Add file" aria-label="Add file" disabled={sending || loading || !!readError} onClick={() => filePicker.current?.click()}>+</button>
      <button className="messenger-attach-button" type="button" title="Add photo or video" aria-label="Add photo or video" disabled={sending || loading || !!readError} onClick={() => mediaPicker.current?.click()}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/></svg></button>
      <label className="sr-only" htmlFor="chat-message">Message</label>
      <textarea ref={composer} id="chat-message" value={text} onChange={event => setText(event.target.value)} onPaste={event => { const pasted = event.clipboardData.files[0]; if (pasted) { event.preventDefault(); selectFile(pasted); } }} maxLength={2000} rows={2} disabled={sending || !!readError || loading} placeholder={replyTo ? "Write your reply…" : "Write a message…"} onKeyDown={event => { if (event.key === "Escape" && !sending) setReplyTo(null); if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <button aria-label={sending ? "Sending message" : "Send message"} disabled={sending || loading || !!readError || (!text.trim() && !file)}>{sending ? "…" : "➤"}</button>
    </form>
    <p className="messenger-composer-note">Enter to send · Shift + Enter for a new line · Paste images here - One file per message, up to 20 MB</p>
  </section>;
}

export function AdminUsers() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !profile?.admin) return;
    return onSnapshot(collection(getFirebase().db, "users"), snapshot => {
      setAccounts(snapshot.docs.map(document => ({ uid: document.id, name: String(document.data().name ?? ""), email: String(document.data().email ?? ""), admin: document.data().admin === true }))
        .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)));
      setLoading(false); setError("");
    }, () => { setAccounts([]); setLoading(false); setError("Unable to load accounts. Please reload and try again."); });
  }, [user, profile?.admin]);

  if (!user || !profile?.admin) return null;

  return <section className="admin-users" aria-label="User management">
    <h3>All users</h3><p>Choose a client to start or continue a conversation.</p>
    {loading && <p role="status">Loading accounts…</p>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    {!loading && !error && <div className="account-list" role="region" aria-label="Registered accounts" tabIndex={0}>
      <table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Chat</th></tr></thead><tbody>{accounts.map(account => <tr key={account.uid}>
        <td>{account.name || "—"}<div><PresenceStatus uid={account.uid} /></div></td><td>{account.email}</td><td>{account.admin ? "Admin" : "Client"}</td>
        <td>{!account.admin ? <Link className="auth-secondary" href={`/messages?client=${encodeURIComponent(account.uid)}`}>Start chat <UnreadBadge clientId={account.uid} /> ↗</Link> : "—"}</td>
      </tr>)}</tbody></table>{!accounts.length && <p>No accounts found.</p>}
    </div>}
  </section>;
}

export function MessagesSection({ initialClient = "" }: { initialClient?: string }) {
  const { user, profile, loading, error: authError, retry } = useAuth();
  if (loading) return <div className="wrap messenger-status" role="status">Opening your messages…</div>;
  if (!user) return <div className="wrap messenger-status"><h2>Your conversations, together.</h2><p>Sign in to send and receive messages.</p><Link className="button primary" href="/account">Sign in ↗</Link></div>;
  if (!profile) return <div className="wrap messenger-status"><p role="alert">{authError || "Your account profile is unavailable. Please reload."}</p><button className="auth-secondary" onClick={retry}>Try again</button></div>;
  return <Messenger key={`${user.uid}:${profile.admin}`} initialClient={initialClient} admin={profile.admin} uid={user.uid} />;
}

function Messenger({ initialClient, admin, uid }: { initialClient: string; admin: boolean; uid: string }) {
  const { error: unreadError } = useUnread();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState(admin ? initialClient : uid);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(admin);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!admin) return;
    return onSnapshot(collection(getFirebase().db, "users"), snapshot => {
      setAccounts(snapshot.docs.map(document => ({ uid: document.id, name: String(document.data().name ?? ""), email: String(document.data().email ?? ""), admin: document.data().admin === true })).filter(account => !account.admin).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)));
      setLoading(false); setError("");
    }, () => { setAccounts([]); setLoading(false); setError("Unable to load conversations. Please reload and try again."); });
  }, [admin]);

  const contacts = admin ? accounts : [{ uid, name: "Ninja Aetherion", email: "Your project starts with a hello", admin: false }];
  const active = contacts.find(account => account.uid === selected);
  const visible = contacts.filter(account => `${account.name} ${account.email}`.toLowerCase().includes(search.toLowerCase()));

  return <section className={`wrap messenger-shell${active ? " messenger-has-thread" : ""}`} aria-label="Messages">
    <aside className="messenger-sidebar">
      <div className="messenger-sidebar-title"><div><p className="eyebrow">LET’S CONNECT</p><h1>Messages<span>✦</span></h1></div><Link href="/account" className="messenger-account-link" aria-label="Go to my account">↗</Link></div>
      {admin && <label className="messenger-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search conversations</span><input type="search" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)} /></label>}
      <p className="messenger-list-label">{admin ? "CLIENTS" : "YOUR CONVERSATIONS"}<span>{contacts.length}</span></p>
      <nav className="messenger-contacts" aria-label="Conversations">
        {loading && <p role="status">Loading conversations…</p>}
        {error && <p role="alert" className="messenger-error">{error}</p>}
        {unreadError && <p role="alert" className="messenger-error">{unreadError}</p>}
        {!loading && !error && !visible.length && <p>{search ? "No matching conversations." : "Your clients will appear here when they register."}</p>}
        {visible.map(account => <button key={account.uid} aria-pressed={active?.uid === account.uid} onClick={() => setSelected(account.uid)}><span className="messenger-avatar" aria-hidden="true">{(account.name || account.email || "?").slice(0, 1).toUpperCase()}</span><span className="messenger-contact-copy"><strong>{account.name || account.email}</strong><span><PresenceStatus uid={admin ? account.uid : undefined} /></span></span><UnreadBadge clientId={account.uid} /><span className="messenger-contact-arrow" aria-hidden="true">›</span></button>)}
      </nav>
      <div className="messenger-sidebar-footer"><span>✦</span><p>A little hello.<br /><strong>A world of possibility.</strong></p></div>
    </aside>
    {active ? <AccountChat key={active.uid} clientId={active.uid} clientName={active.name || active.email} onBack={() => setSelected("")} /> : <div className="messenger-empty"><span aria-hidden="true">☏</span><h2>A conversation<br />can change everything.</h2><p>{admin ? "Choose a client to start a conversation or pick up where you left off." : "Choose your conversation to say hello."}</p></div>}
  </section>;
}
