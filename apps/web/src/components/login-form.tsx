"use client";

import { logIn, sendPasswordReset } from "@score-masterz/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AuthCard, inputClass, labelClass, primaryBtn } from "@/components/auth-ui";
import { siteUrl, useAccount } from "@/hooks/use-account";

export function LoginForm() {
  const router = useRouter();
  const { supabase, account } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await task();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    void run(async () => {
      await logIn(supabase, email, password);
      router.push("/teams/");
    });
  }

  function onForgot() {
    if (!supabase) return;
    void run(async () => {
      await sendPasswordReset(supabase, email, siteUrl("/account/"));
      setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
    });
  }

  if (!supabase) return <AuthCard title="Log in"><Alert tone="info">Supabase is not configured.</Alert></AuthCard>;

  if (account && !account.isGuest) {
    return (
      <AuthCard title="Log in">
        <Alert tone="success">You&apos;re logged in as {account.email}.</Alert>
        <Link href="/account/" className="font-bold text-pitch">Go to your account →</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Log in"
      subtitle={
        <>
          New here? <Link href="/signup/" className="font-bold text-pitch">Create an account</Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Email
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className={labelClass}>
          Password
          <input
            className={inputClass}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <button type="button" onClick={onForgot} disabled={busy || !email} className="min-h-11 self-start font-bold text-pitch disabled:opacity-50">
        Forgot password?
      </button>
      {account?.isGuest && (
        <p className="text-sm text-muted">
          You&apos;re using a guest account on this device. Logging in switches to your saved account; anything created as a guest
          stays with the guest. To keep it, <Link href="/signup/" className="font-bold text-pitch">sign up</Link> instead.
        </p>
      )}
    </AuthCard>
  );
}
