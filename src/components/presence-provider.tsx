"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { getFirebase } from "@/lib/firebase";
import { presenceStatus, type PresenceSession } from "@/lib/presence";

const PresenceContext = createContext<{ sessions: PresenceSession[]; now: number; available: boolean }>({ sessions: [], now: 0, available: false });

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const admin = profile?.admin;
  const [state, setState] = useState<{ owner: string; sessions: PresenceSession[]; available: boolean }>({ owner: "", sessions: [], available: false });
  const [now, setNow] = useState(0);
  const owner = uid && admin !== undefined ? `${uid}:${admin}` : "";

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid || admin === undefined) return;
    const { db } = getFirebase();
    // Each tab/device owns its own session, so closing one cannot hide another.
    const reference = doc(collection(db, "presence"));
    let inFlight = false;
    let stopped = false;
    async function heartbeat() {
      if (stopped || inFlight || !navigator.onLine) return;
      inFlight = true;
      const online = document.visibilityState === "visible";
      try { await setDoc(reference, { uid, admin, online, lastActiveAt: serverTimestamp() }); }
      catch { /* Status remains unknown or expires when writes cannot reach Firebase. */ }
      finally {
        inFlight = false;
        if (!stopped && online !== (document.visibilityState === "visible")) void heartbeat();
      }
    }
    const pulse = () => { if (document.visibilityState === "visible") void heartbeat(); };
    const changed = () => { void heartbeat(); };
    void heartbeat();
    const timer = setInterval(pulse, 30_000);
    document.addEventListener("visibilitychange", changed);
    window.addEventListener("online", changed);
    window.addEventListener("pagehide", changed);
    return () => {
      stopped = true; clearInterval(timer);
      document.removeEventListener("visibilitychange", changed);
      window.removeEventListener("online", changed);
      window.removeEventListener("pagehide", changed);
      if (navigator.onLine) void setDoc(reference, { uid, admin, online: false, lastActiveAt: serverTimestamp() }).catch(() => {});
    };
  }, [uid, admin]);

  useEffect(() => {
    if (!owner) return;
    const records = collection(getFirebase().db, "presence");
    // Clients see only site administrator activity, never other clients.
    const source = admin ? records : query(records, where("admin", "==", true));
    return onSnapshot(source, { includeMetadataChanges: true }, snapshot => setState({ owner, available: !snapshot.metadata.fromCache, sessions: snapshot.docs.map(document => ({
      uid: String(document.data().uid), admin: document.data().admin === true, online: document.data().online === true,
      lastActiveAt: document.data().lastActiveAt?.toMillis?.() ?? 0,
    })) }), () => setState({ owner, available: false, sessions: [] }));
  }, [owner, admin]);

  return <PresenceContext.Provider value={{ sessions: state.owner === owner ? state.sessions : [], available: state.owner === owner && state.available, now }}>{children}</PresenceContext.Provider>;
}

export function PresenceStatus({ uid }: { uid?: string }) {
  const { sessions, now, available } = useContext(PresenceContext);
  const status = presenceStatus(sessions.filter(session => uid ? session.uid === uid : session.admin), now);
  const active = available && status.active;
  return <span className={`presence-status${active ? " presence-active" : ""}`} title={available && status.lastActiveAt ? `Last active: ${new Date(status.lastActiveAt).toLocaleString()}` : undefined}>
    <i aria-hidden="true" />{available ? status.label : "Activity unavailable"}
  </span>;
}
