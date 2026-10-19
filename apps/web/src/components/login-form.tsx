"use client";

import { logIn, sendPasswordReset } from "@score-masterz/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AuthHeading, AuthLayout, PasswordInput, inputClass, labelClass, outlineBtn, primaryBtn } from "@/components/auth-ui";
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
    if (!email.trim()) {
      setError("Enter your email above, then tap Forgot password.");
      return;
    }
    void run(async () => {
      await sendPasswordReset(supabase, email, siteUrl("/account/"));
      setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
    });
  }

  if (!supabase) {
    return (
      <AuthLayout variant="login">
        <Alert tone="info">Supabase is not configured.</Alert>
      </AuthLayout>
    );
  }

  if (account && !account.isGuest) {
    return (
      <AuthLayout variant="login">
        <AuthHeading title="Welcome back">You&apos;re logged in as {account.email}.</AuthHeading>
        <Link href="/teams/" className={`${primaryBtn} grid place-items-center`}>Go to my teams</Link>
        <Link href="/account/" className={outlineBtn}>My account</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout variant="login">
      <AuthHeading title="Welcome back">Log in to score and manage your teams.</AuthHeading>
      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Email
          <input className={inputClass} type="email" autoComplete="email" placeholder="you@club.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="login-password" className="text-[13px] font-bold text-ink-soft">Password</label>
            <button type="button" onClick={onForgot} disabled={busy} className="-my-3 inline-flex min-h-11 items-center text-[13px] font-bold text-pitch disabled:opacity-50">
              Forgot password?
            </button>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        New to Score Masterz?
        <span className="h-px flex-1 bg-line" />
      </div>
      <Link href="/signup/" className={outlineBtn}>Create an account</Link>

      {account?.isGuest && (
        <p className="rounded-xl bg-gold-tint px-3.5 py-3 text-[13px] leading-snug text-gold-ink">
          Using a guest account on this device? <Link href="/signup/" className="font-bold text-gold-ink underline">Sign up instead</Link> to
          keep the teams you&apos;ve already made. Logging in switches to your saved account.
        </p>
      )}
    </AuthLayout>
  );
}
