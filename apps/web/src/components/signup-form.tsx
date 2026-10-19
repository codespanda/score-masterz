"use client";

import { MIN_PASSWORD_LENGTH, setPassword, startSignup, verifySignupCode } from "@score-masterz/data";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  Alert,
  AuthHeading,
  AuthLayout,
  CodeInput,
  PasswordInput,
  Steps,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/auth-ui";
import { siteUrl, useAccount } from "@/hooks/use-account";

/** 0–4 bars: length plus a mix of letters, digits and symbols. */
function strength(pw: string): { bars: number; label: string } {
  if (!pw) return { bars: 0, label: `At least ${MIN_PASSWORD_LENGTH} characters` };
  if (pw.length < MIN_PASSWORD_LENGTH) return { bars: 1, label: `Too short · at least ${MIN_PASSWORD_LENGTH} characters` };
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const bars = Math.min(4, 1 + kinds - (pw.length < 12 ? 1 : 0));
  return { bars: Math.max(2, bars), label: bars >= 4 ? "Strong" : bars === 3 ? "Good" : "OK · add numbers or symbols" };
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

  if (!supabase) {
    return (
      <AuthLayout variant="signup">
        <Alert tone="info">Supabase is not configured.</Alert>
      </AuthLayout>
    );
  }
  if (account === undefined) {
    return (
      <AuthLayout variant="signup">
        <p className="text-muted">Loading…</p>
      </AuthLayout>
    );
  }

  const pending = sentTo ?? account?.pendingEmail ?? null;
  const messages = (
    <>
      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
    </>
  );

  // Done.
  if (account && !account.isGuest && !account.needsPassword) {
    return (
      <AuthLayout variant="signup">
        <span className="grid h-[72px] w-[72px] place-items-center rounded-full bg-pitch">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#F2B705" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        </span>
        <AuthHeading title={account.name ? `You're in, ${account.name.split(" ")[0]}` : "You're in"}>
          Your account is ready. Your teams and matches are saved to it, so you can log in on any device.
        </AuthHeading>
        <Link href="/teams/" className={`${primaryBtn} grid place-items-center`}>Go to my teams</Link>
      </AuthLayout>
    );
  }

  // Step 3: email verified (by code here, or by the email link which returns to this page).
  if (account && !account.isGuest && account.needsPassword) {
    const s = strength(password);
    return (
      <AuthLayout variant="signup">
        <Steps current={3} />
        <AuthHeading title="Choose a password">
          <span className="font-bold text-pitch">✓ Email verified</span> · {account.email}
        </AuthHeading>
        {messages}
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
            Password
            <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPw(e.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
          </label>
          <div className="flex flex-col gap-1.5" aria-live="polite">
            <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className={`h-1.5 rounded-full ${i <= s.bars ? (s.bars <= 1 ? "bg-wicket" : "bg-pitch") : "bg-line"}`} />
              ))}
            </div>
            <span className={`text-[13px] font-bold ${s.bars <= 1 ? "text-muted" : "text-pitch"}`}>{s.label}</span>
          </div>
          <label className={labelClass}>
            Confirm password
            <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Saving…" : "Finish sign-up"}
          </button>
        </form>
      </AuthLayout>
    );
  }

  // Step 2: waiting for the email to be verified.
  if (pending) {
    return (
      <AuthLayout variant="signup">
        <Steps current={2} />
        <span className="grid h-16 w-16 place-items-center rounded-[18px] bg-gold-tint">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8A6400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </span>
        <AuthHeading title="Check your email">
          We sent a verification email to <strong className="text-ink">{pending}</strong>. Click the link, or enter the 6-digit code if
          the email shows one.
        </AuthHeading>
        {messages}
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
          <CodeInput label="6-digit code" value={code} onChange={setCode} />
          <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
            {code.length === 6 ? "Verify" : "Enter all 6 digits"}
          </button>
        </form>
        <div className="flex flex-wrap justify-between gap-4 text-sm">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await startSignup(supabase, { name: account?.name ?? (name || "Player"), email: pending }, siteUrl("/signup/"));
                setInfo("Sent again.");
              })
            }
            className="min-h-11 font-bold text-muted hover:text-ink disabled:opacity-50"
          >
            Resend email
          </button>
          <button type="button" onClick={() => setSentTo(null)} className="min-h-11 font-bold text-pitch">
            Use a different email
          </button>
        </div>
      </AuthLayout>
    );
  }

  // Step 1: details.
  return (
    <AuthLayout variant="signup">
      <Steps current={1} />
      <AuthHeading title="Create account">
        Already have one? <Link href="/login/" className="font-bold text-pitch">Log in</Link>
      </AuthHeading>
      {messages}
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
          <input className={inputClass} type="email" autoComplete="email" placeholder="you@club.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className={primaryBtn}>
          {busy ? "Sending…" : "Send verification email"}
        </button>
      </form>
      <p className="rounded-xl bg-pitch-tint px-3.5 py-3 text-[13px] leading-snug text-pitch">
        <strong>Nothing gets lost.</strong> Teams and matches you created as a guest move into your new account.
      </p>
    </AuthLayout>
  );
}
