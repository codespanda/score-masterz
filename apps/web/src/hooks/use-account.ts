"use client";

import { ensureSession, getAccount, onAccountChange, type Account } from "@score-masterz/data";
import { useEffect, useState } from "react";

import { getSupabase } from "@/lib/supabase";

/** The signed-in account (a guest until someone signs up or logs in), kept current. */
export function useAccount() {
  const supabase = getSupabase();
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    ensureSession(supabase)
      .then(() => getAccount(supabase))
      .then((a) => !cancelled && setAccount(a))
      .catch((e: Error) => !cancelled && setError(e.message));
    const stop = onAccountChange(supabase, (a) => !cancelled && setAccount(a));
    return () => {
      cancelled = true;
      stop();
    };
  }, [supabase]);

  return { supabase, account, error, refresh: async () => supabase && setAccount(await getAccount(supabase)) };
}

/** Absolute URL of a page on this site, for links in emails (respects the GitHub Pages base path). */
export function siteUrl(path: string): string {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
}
