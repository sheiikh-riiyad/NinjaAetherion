"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, runTransaction, Timestamp, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getFirebase } from "@/lib/firebase";

const UnreadContext = createContext<{ counts: Record<string, number>; total: number; error: string }>({ counts: {}, total: 0, error: "" });

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState<{ owner: string; counts: Record<string, number>; error: string }>({ owner: "", counts: {}, error: "" });
  const owner = user && profile ? `${user.uid}:${profile.admin}` : "";

  useEffect(() => {
    if (!user || !profile) return;
    const { db } = getFirebase();
    let alive = true;
    const threads = new Map<string, () => void>();
    const update = (id: string, count: number) => {
      if (alive) setState(previous => ({ owner, counts: { ...(previous.owner === owner ? previous.counts : {}), [id]: count }, error: previous.owner === owner ? previous.error : "" }));
    };
    const fail = () => { if (alive) setState(previous => ({ owner, counts: previous.owner === owner ? previous.counts : {}, error: "Unread counts could not be updated. Please reload." })); };
    function watchThread(id: string, peer = false) {
      const key = peer ? `peer:${id}` : id;
      let stopMessages: (() => void) | undefined;
      const stopRead = onSnapshot(doc(db, peer ? "peerChats" : "users", id, "chatReads", user!.uid), snapshot => {
        stopMessages?.();
        const cursor = snapshot.data()?.lastReadAt;
        const since = cursor instanceof Timestamp ? cursor : Timestamp.fromMillis(0);
        stopMessages = onSnapshot(query(collection(db, peer ? "peerChats" : "users", id, "messages"), where("createdAt", ">", since)), messages => {
          update(key, messages.docs.filter(message => message.data().senderId !== user!.uid && !message.metadata.hasPendingWrites).length);
        }, fail);
      }, fail);
      threads.set(key, () => { stopRead(); stopMessages?.(); });
    }
    let stopAccounts: (() => void) | undefined;
    if (profile.admin) {
      stopAccounts = onSnapshot(collection(db, "users"), snapshot => {
        const ids = new Set(snapshot.docs.filter(account => account.data().admin !== true).map(account => account.id));
        for (const [id, stop] of threads) if (!id.startsWith("peer:") && !ids.has(id)) { stop(); threads.delete(id); update(id, 0); }
        for (const id of ids) if (!threads.has(id)) watchThread(id);
      }, fail);
    } else watchThread(user.uid);
    const stopPeers = onSnapshot(query(collection(db, "peerChats"), where("members", "array-contains", user.uid)), snapshot => {
      const ids = new Set(snapshot.docs.map(thread => thread.id));
      for (const [key, stop] of threads) if (key.startsWith("peer:") && !ids.has(key.slice(5))) { stop(); threads.delete(key); update(key, 0); }
      for (const id of ids) if (!threads.has(`peer:${id}`)) watchThread(id, true);
    }, fail);
    return () => { alive = false; stopPeers(); stopAccounts?.(); for (const stop of threads.values()) stop(); };
  }, [owner, user, profile]);

  const counts = state.owner === owner ? state.counts : {};
  return <UnreadContext.Provider value={{ counts, total: Object.entries(counts).filter(([key]) => !key.startsWith("peer:")).reduce((sum, [, count]) => sum + count, 0), error: state.owner === owner ? state.error : "" }}>{children}</UnreadContext.Provider>;
}

export function useUnread() { return useContext(UnreadContext); }

export function PeerUnreadBadge({ peerChatId }: { peerChatId?: string }) {
  const { counts } = useUnread();
  const count = peerChatId ? counts[`peer:${peerChatId}`] ?? 0 : Object.entries(counts).filter(([key]) => key.startsWith("peer:")).reduce((sum, [, value]) => sum + value, 0);
  return count > 0 ? <span className="unread-badge" aria-label={`${count} unread client messages`}>{count > 99 ? "99+" : count}</span> : null;
}

export function UnreadBadge({ clientId }: { clientId?: string }) {
  const { counts, total } = useUnread();
  const count = clientId ? counts[clientId] ?? 0 : total;
  return count > 0 ? <span className="unread-badge" aria-label={`${count} unread message${count === 1 ? "" : "s"}`}>{count > 99 ? "99+" : count}</span> : null;
}

export async function markChatRead(clientId: string, readerId: string, lastReadAt: Timestamp, peerChatId?: string) {
  const { db } = getFirebase();
  const reference = peerChatId ? doc(db, "peerChats", peerChatId, "chatReads", readerId) : doc(db, "users", clientId, "chatReads", readerId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    const previous = snapshot.data()?.lastReadAt;
    if (!(previous instanceof Timestamp) || previous.valueOf() < lastReadAt.valueOf()) transaction.set(reference, { lastReadAt });
  });
}
