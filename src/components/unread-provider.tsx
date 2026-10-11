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
    function watchThread(id: string) {
      let stopMessages: (() => void) | undefined;
      const stopRead = onSnapshot(doc(db, "users", id, "chatReads", user!.uid), snapshot => {
        stopMessages?.();
        const cursor = snapshot.data()?.lastReadAt;
        const since = cursor instanceof Timestamp ? cursor : Timestamp.fromMillis(0);
        stopMessages = onSnapshot(query(collection(db, "users", id, "messages"), where("createdAt", ">", since)), messages => {
          update(id, messages.docs.filter(message => message.data().senderId !== user!.uid && !message.metadata.hasPendingWrites).length);
        }, fail);
      }, fail);
      threads.set(id, () => { stopRead(); stopMessages?.(); });
    }
    let stopAccounts: (() => void) | undefined;
    if (profile.admin) {
      stopAccounts = onSnapshot(collection(db, "users"), snapshot => {
        const ids = new Set(snapshot.docs.filter(account => account.data().admin !== true).map(account => account.id));
        for (const [id, stop] of threads) if (!ids.has(id)) { stop(); threads.delete(id); update(id, 0); }
        for (const id of ids) if (!threads.has(id)) watchThread(id);
      }, fail);
    } else watchThread(user.uid);
    return () => { alive = false; stopAccounts?.(); for (const stop of threads.values()) stop(); };
  }, [owner, user, profile]);

  const counts = state.owner === owner ? state.counts : {};
  return <UnreadContext.Provider value={{ counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0), error: state.owner === owner ? state.error : "" }}>{children}</UnreadContext.Provider>;
}

export function useUnread() { return useContext(UnreadContext); }

export function UnreadBadge({ clientId }: { clientId?: string }) {
  const { counts, total } = useUnread();
  const count = clientId ? counts[clientId] ?? 0 : total;
  return count > 0 ? <span className="unread-badge" aria-label={`${count} unread message${count === 1 ? "" : "s"}`}>{count > 99 ? "99+" : count}</span> : null;
}

export async function markChatRead(clientId: string, readerId: string, lastReadAt: Timestamp) {
  const { db } = getFirebase();
  const reference = doc(db, "users", clientId, "chatReads", readerId);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    const previous = snapshot.data()?.lastReadAt;
    if (!(previous instanceof Timestamp) || previous.valueOf() < lastReadAt.valueOf()) transaction.set(reference, { lastReadAt });
  });
}
