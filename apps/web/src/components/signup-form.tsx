"use client";

import { MIN_PASSWORD_LENGTH, setPassword, startSignup, verifySignupCode } from "@score-masterz/data";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Alert, AuthCard, inputClass, labelClass, primaryBtn } from "@/components/auth-ui";
import { siteUrl, useAccount } from "@/hooks/use-account";

function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Your details", "Verify email", "Password"];
  return (
    <ol aria-label="Sign-up steps" className="flex gap-2 text-[13px] font-bold">
      {steps.map((label, i) => (
        <li
          key={label}
          aria-current={i + 1 === current ? "step" : undefined}
          className={`flex-1 rounded-lg px-2 py-2 text-center ${i + 1 === current ? "bg-pitch text-white" : i + 1 < current ? "bg-pitch-tint text-pitch" : "bg-ground text-muted"}`}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

export function SignupForm() {
  const { supabase, account, refresh } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
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

  if (!supabase) return <AuthCard title="Sign up"><Alert tone="info">Supabase is not configured.</Alert></AuthCard>;
  if (account === undefined) return <AuthCard title="Sign up"><p className="text-muted">Loading…</p></AuthCard>;

  const pending = sentTo ?? account?.pendingEmail ?? null;

  // Step 3: email verified (by code here, or by the link which brings them back to this page).
  if (account && !account.isGuest && account.needsPassword) {
    return (
      <AuthCard title="Choose a password" subtitle={`Email verified: ${account.email}`}>
        <Steps current={3} />
        {error && <Alert tone="error">{error}</Alert>}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(async () => {
              await setPassword(supabase, password, confirm);
              await refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          <label className={labelClass}>
            Password (at least {MIN_PASSWORD_LENGTH} characters)
            <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPw(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
          </label>
          <label className={labelClass}>
            Confirm password
            <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Saving…" : "Finish sign-up"}
          </button>
        </form>
      </AuthCard>
    );
  }

  // Done.
  if (account && !account.isGuest) {
    return (
      <AuthCard title="You're signed up" subtitle={account.email ?? undefined}>
        <Alert tone="success">
          Your account is ready{account.name ? `, ${account.name}` : ""}. Your teams and matches are saved to it, so you can log in on any device.
        </Alert>
        <Link href="/teams/" className="font-bold text-pitch">Go to your teams →</Link>
      </AuthCard>
    );
  }

  // Step 2: waiting for the email to be verified.
  if (pending) {
    return (
      <AuthCard title="Check your email" subtitle={<>We sent a verification email to <strong className="text-ink">{pending}</strong>.</>}>
        <Steps current={2} />
        {error && <Alert tone="error">{error}</Alert>}
        {info && <Alert tone="success">{info}</Alert>}
        <p className="text-sm text-ink-soft">Click the link in the email, or enter the 6-digit code if the email shows one.</p>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            void run(async () => {
              await verifySignupCode(supabase, pending, code);
              await refresh();
            });
          }}
          className="flex flex-col gap-4"
        >
          <label className={labelClass}>
            6-digit code
            <input
              className={`${inputClass} tracking-[0.3em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
            Verify
          </button>
        </form>
        <div className="flex flex-wrap gap-4 text-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await startSignup(supabase, { name: account?.name ?? (name || "Player"), email: pending }, siteUrl("/signup/"));
                setInfo("Sent again.");
              })
            }
            className="min-h-11 font-bold text-pitch disabled:opacity-50"
          >
            Resend email
          </button>
          <button type="button" onClick={() => setSentTo(null)} className="min-h-11 font-bold text-muted">
            Use a different email
          </button>
        </div>
      </AuthCard>
    );
  }

  // Step 1: details.
  return (
    <AuthCard
      title="Sign up"
      subtitle={
        <>
          Already have an account? <Link href="/login/" className="font-bold text-pitch">Log in</Link>
        </>
      }
    >
      <Steps current={1} />
      {error && <Alert tone="error">{error}</Alert>}
      <p className="text-sm text-ink-soft">
        Save your teams, players and matches to an account so you can use them on any device. Everything you&apos;ve created on
        this device comes with you.
      </p>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void run(async () => setSentTo(await startSignup(supabase, { name, email }, siteUrl("/signup/"))));
        }}
        className="flex flex-col gap-4"
      >
        <label className={labelClass}>
          Your name
          <input className={inputClass} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </label>
        <label className={labelClass}>
          Email
          <input className={inputClass} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Sending…" : "Send verification email"}
        </button>
      </form>
    </AuthCard>
  );
}
