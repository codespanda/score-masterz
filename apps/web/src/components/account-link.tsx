"use client";

import Link from "next/link";

import { useAccount } from "@/hooks/use-account";

export function AccountLink() {
  const { account } = useAccount();
  // No display class here: each link sets its own, so "hidden" can't be overridden.
  const base = "min-h-11 items-center rounded-[10px] px-3 font-bold sm:px-4";

  if (account && !account.isGuest) {
    const label = account.name ?? account.email ?? "Account";
    return (
      <Link href="/account/" className={`${base} inline-flex gap-2 bg-white/10 text-white hover:bg-white/15`}>
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-gold text-sm text-scoreboard">
          {label.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[140px] truncate">{label}</span>
      </Link>
    );
  }
  return (
    <span className="flex gap-1">
      <Link href="/login/" className={`${base} inline-flex text-on-board-soft hover:text-white`}>Log in</Link>
      {/* On phones there's only room for one button beside the logo; sign-up is one tap away from Log in. */}
      <Link href="/signup/" className={`${base} hidden border border-white/30 text-white hover:bg-white/10 sm:inline-flex`}>Sign up</Link>
    </span>
  );
}
