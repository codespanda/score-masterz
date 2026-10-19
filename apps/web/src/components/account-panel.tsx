"use client";

import { logOut, setPassword } from "@score-masterz/data";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert, AuthCard, inputClass, labelClass, primaryBtn } from "@/components/auth-ui";
import { useAccount } from "@/hooks/use-account";

export function AccountPanel() {
  const router = useRouter();
  const { supabase, account, refresh } = useAccount();
  const [password, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!supabase) return <AuthCard title="Account"><Alert tone="info">Supabase is not configured.</Alert></AuthCard>;
  if (account === undefined) return <AuthCard title="Account"><p className="text-muted">Loading…</p></AuthCard>;

  if (!account || account.isGuest) {
    return (
      <AuthCard title="Account" subtitle="You're using a guest account on this device.">
        <Alert tone="info">Guest data only lives in this browser. If its data is cleared, your teams can&apos;t be edited any more.</Alert>
        <Link href="/signup/" className={`${primaryBtn} grid place-items-center`}>Sign up and keep my data</Link>
        <Link href="/login/" className="min-h-11 self-center font-bold text-pitch">I already have an account</Link>
      </AuthCard>
    );
  }

  async function onSetPassword(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await setPassword(supabase, password, confirm);
      await refresh();
      setPw("");
      setConfirm("");
      setInfo("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Account" subtitle={account.name ?? undefined}>
      {error && <Alert tone="error">{error}</Alert>}
      {info && <Alert tone="success">{info}</Alert>}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Email</dt>
        <dd className="font-bold">{account.email}</dd>
        {account.name && (
          <>
            <dt className="text-muted">Name</dt>
            <dd className="font-bold">{account.name}</dd>
          </>
        )}
      </dl>
      {account.needsPassword && <Alert tone="info">Choose a password to finish setting up your account.</Alert>}
      <form onSubmit={onSetPassword} className="flex flex-col gap-3 border-t border-line-soft pt-4">
        <h2 className="font-bold">{account.needsPassword ? "Choose a password" : "Change password"}</h2>
        <label className={labelClass}>
          New password
          <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPw(e.target.value)} required />
        </label>
        <label className={labelClass}>
          Confirm new password
          <input className={inputClass} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </label>
        <button type="submit" disabled={busy} className={primaryBtn}>Save password</button>
      </form>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          await logOut(supabase);
          router.push("/login/");
        }}
        className="min-h-11 self-start font-bold text-wicket"
      >
        Log out
      </button>
    </AuthCard>
  );
}
