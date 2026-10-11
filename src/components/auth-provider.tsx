"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { firebaseConfigured, getFirebase } from "@/lib/firebase";

type Profile = { email: string; name: string; admin: boolean };
export async function ensureUserProfile(user: User) {
  const { db } = getFirebase();
  const reference = doc(db, "users", user.uid);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) transaction.set(reference, { email: user.email ?? "", name: (user.displayName ?? "").slice(0, 100), admin: false, createdAt: serverTimestamp() });
  });
}
const AuthContext = createContext<{ user: User | null; profile: Profile | null; loading: boolean; error: string; retry: () => void }>({ user: null, profile: null, loading: true, error: "", retry: () => {} });

function profileError(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : "";
  return code === "permission-denied" ? "Your account could not be accessed. Please contact the site owner." : "Unable to connect to your account. Check your internet connection and try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ user: User | null; profile: Profile | null; loading: boolean; error: string }>({ user: null, profile: null, loading: false, error: "" });
  useEffect(() => {
    if (!firebaseConfigured) return;
    let generation = 0;
    let stopProfile: (() => void) | undefined;
    let stopAuth: (() => void) | undefined;
    let loadingTimer: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      setState(previous => ({ ...previous, loading: false, error: "Session restoration is taking longer than expected. You can sign in below or try again." }));
    }, 10000);
    async function connect() {
      try {
        const { auth, db } = getFirebase();
        stopAuth = onAuthStateChanged(auth, async user => {
      const current = ++generation;
      stopProfile?.();
      clearTimeout(loadingTimer);
      setState({ user, profile: null, loading: !!user, error: "" });
      if (!user) return;
      loadingTimer = setTimeout(() => {
        if (current === generation) setState({ user, profile: null, loading: false, error: "Connecting is taking longer than expected. Check your connection, then try again." });
      }, 15000);
      try {
        const reference = doc(db, "users", user.uid);
        await ensureUserProfile(user);
        if (current !== generation) return;
        stopProfile = onSnapshot(reference, snapshot => {
          if (current !== generation) return;
          clearTimeout(loadingTimer);
          const data = snapshot.data();
          setState({ user, profile: data ? { email: data.email, name: data.name, admin: data.admin === true } : null, loading: false, error: data ? "" : "Your account profile is unavailable." });
        }, error => { if (current === generation) { clearTimeout(loadingTimer); setState({ user, profile: null, loading: false, error: profileError(error) }); } });
      } catch (error) {
        if (current === generation) { clearTimeout(loadingTimer); setState({ user, profile: null, loading: false, error: profileError(error) }); }
      }
        }, () => { clearTimeout(loadingTimer); setState({ user: null, profile: null, loading: false, error: "Unable to restore your session. Please try again." }); });
      } catch {
        clearTimeout(loadingTimer);
        setState({ user: null, profile: null, loading: false, error: "Sign-in could not initialize in this browser. Please reload or try another browser." });
      }
    }
    void connect();
    return () => { generation++; clearTimeout(loadingTimer); stopAuth?.(); stopProfile?.(); };
  }, [attempt]);
  return <AuthContext.Provider value={{ ...state, retry: () => setAttempt(value => value + 1) }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
