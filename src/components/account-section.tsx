"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { AdminUsers } from "@/components/account-chat";
import { UnreadBadge } from "@/components/unread-provider";
import { ensureUserProfile, useAuth } from "@/components/auth-provider";
import { firebaseConfigured, getFirebase, signInWithGoogle } from "@/lib/firebase";

function errorMessage(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account already uses this email. Sign in or reset your password.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/password-does-not-meet-requirements": "Your password does not meet the account password requirements.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Check your internet connection and try again.",
    "auth/popup-blocked": "Your browser blocked the sign-in window. Allow popups and try again.",
    "auth/popup-closed-by-user": "The Google sign-in window was closed. Please try again.",
    "auth/cancelled-popup-request": "Another sign-in window is already open. Please finish signing in there.",
    "auth/account-exists-with-different-credential": "This email already uses another sign-in method. Sign in using that method.",
    "auth/operation-not-allowed": "This sign-in method is not enabled yet. Please contact the site owner.",
    "auth/unauthorized-domain": "Sign-in is not available on this website address yet. Please contact the site owner.",
  };
  return messages[code] ?? "Unable to complete this request. Please try again.";
}

export function AccountSection({ adminOnly = false }: { adminOnly?: boolean }) {
  const { user, profile, loading, error, retry } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");

  async function googleLogin() {
    setBusy(true); setFailure(""); setNotice("Opening Google sign-in…");
    try {
      const result = await signInWithGoogle();
      await ensureUserProfile(result.user);
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); setNotice(""); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    setBusy(true); setFailure(""); setNotice("");
    try {
      const { auth, db } = getFirebase();
      if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setNotice("If an account exists for this email, you’ll receive password reset instructions.");
      } else if (mode === "register") {
        if (!name) { setFailure("Enter your name."); return; }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        await ensureUserProfile(result.user);
        await updateDoc(doc(db, "users", result.user.uid), { name });
        setNotice("Your client account has been created.");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setFailure("");
    try { await signOut(getFirebase().auth); setNotice(""); }
    catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !profile) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) { setFailure("Enter your name."); return; }
    setBusy(true); setFailure(""); setNotice("");
    try {
      await updateDoc(doc(getFirebase().db, "users", user.uid), { name });
      await updateProfile(user, { displayName: name });
      setNotice("Your name has been saved.");
    } catch (error) { setFailure(errorMessage(error)); }
    finally { setBusy(false); }
  }

  if (!firebaseConfigured) return <section className="wrap account-section"><div className="auth-card"><h2>Accounts are coming soon.</h2><p>Sign-in is not available yet. Please check back shortly.</p></div></section>;
  if (loading) return <section className="wrap account-section"><p role="status">Loading your account…</p></section>;

  return <section className="wrap account-section"><div className="auth-card">
    {user ? <>
      <p className="eyebrow">{profile?.admin ? "ADMIN ACCOUNT" : "CLIENT ACCOUNT"}</p>
      <h2>{adminOnly && !profile?.admin ? "Admin access required." : `Welcome${profile?.name ? `, ${profile.name}` : " back"}.`}</h2>
      <p>{user.email}</p>
      {adminOnly && !profile?.admin && <p>This section is available to the site administrator.</p>}
      {profile && !adminOnly && <form className="contact-form" onSubmit={saveName}><label>Your name<input key={profile.name} name="name" defaultValue={profile.name || user.displayName || ""} required maxLength={100} autoComplete="name" /></label><button className="button primary" disabled={busy}>Save profile</button></form>}
      <div className="auth-actions">{!adminOnly && profile?.admin && <Link className="button primary" href="/admin">Open admin area ↗</Link>}<button className="auth-secondary" disabled={busy} onClick={logout}>Sign out</button>{adminOnly && <Link className="text-link" href="/account">My account ↗</Link>}</div>
      {profile?.admin && <AdminUsers key={user.uid} />}
      {profile && <div className="auth-actions"><Link href="/messages" className="button primary">Open messages <UnreadBadge /> ↗</Link></div>}
    </> : <>
      <div className="filter-row" aria-label="Account options">{(["login", "register", "reset"] as const).filter(value => !adminOnly || value !== "register").map(value => <button key={value} aria-pressed={mode === value} disabled={busy} onClick={() => { setMode(value); setNotice(""); setFailure(""); }}>{value === "login" ? "Sign in" : value === "register" ? "Create account" : "Reset password"}</button>)}</div>
      <h2>{mode === "register" ? "Let’s get started." : mode === "reset" ? "Forgot your password?" : adminOnly ? "Admin sign in." : "Welcome back."}</h2>
      <p>{mode === "register" ? "Create your client account to connect with Ninja Aetherion." : mode === "reset" ? "Enter your email to request a password reset." : "Sign in with your email and password."}</p>
      {mode !== "reset" && <><button type="button" className="auth-google" disabled={busy} onClick={googleLogin}><span aria-hidden="true">G</span>Continue with Google</button><p className="auth-divider">or continue with email</p></>}
      <form className="contact-form" onSubmit={submit}>
        <fieldset disabled={busy}><legend className="sr-only">Account credentials</legend>
          {mode === "register" && <label>Your name<input name="name" required maxLength={100} autoComplete="name" /></label>}
          <label>Email address<input name="email" type="email" required autoComplete="email" maxLength={254} /></label>
          {mode !== "reset" && <label>Password<input name="password" type="password" required minLength={mode === "register" ? 8 : undefined} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} />{mode === "register" && <span>Use at least 8 characters.</span>}</label>}
          <button className="button primary" type="submit">{busy ? "Please wait…" : mode === "register" ? "Create client account ↗" : mode === "reset" ? "Send reset link ↗" : "Sign in ↗"}</button>
        </fieldset>
      </form>
    </>}
    {error && <><p role="alert" className="auth-error">{error}</p><button className="auth-secondary" onClick={retry}>Try again</button></>}
    {failure && <p role="alert" className="auth-error">{failure}</p>}
    {notice && <p role="status" className="form-note">{notice}</p>}
  </div></section>;
}
