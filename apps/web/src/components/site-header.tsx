import Link from "next/link";

import { AccountLink } from "@/components/account-link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Live matches" },
  { href: "/teams", label: "Teams" },
] as const;

// The Expo web build is a separate app, so links to it are full page loads, not Next links.
const scorerHref = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app/`;

export function SiteHeader({ active }: { active: (typeof NAV)[number]["href"] | "/account" }) {
  return (
    <header className="bg-scoreboard text-white">
      {/* Phones: logo + account on the first row, a swipeable nav row below. Wider: one row. */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:gap-x-8 sm:px-6 sm:py-3.5">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="15" fill="#F2B705" />
            <path d="M8 9c5 4 5 12 0 16M26 9c-5 4-5 12 0 16" fill="none" stroke="#08291C" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-display text-[22px] font-bold uppercase tracking-wide sm:text-[26px]">Score Masterz</span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
          <a
            href={scorerHref}
            className="hidden min-h-11 items-center rounded-[10px] bg-gold px-[18px] font-bold text-scoreboard sm:inline-flex"
          >
            Open scorer app
          </a>
          <AccountLink />
        </div>

        <nav aria-label="Main" className="-mx-1 flex w-full gap-1 overflow-x-auto pb-1 [scrollbar-width:none] sm:order-2 sm:mx-0 sm:w-auto sm:flex-1 sm:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === active ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-lg px-3.5 font-medium whitespace-nowrap ${item.href === active ? "bg-white/10 text-white" : "text-on-board-soft hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
          <a href={scorerHref} className="flex min-h-11 shrink-0 items-center rounded-lg px-3.5 font-bold whitespace-nowrap text-gold sm:hidden">
            Scorer app →
          </a>
        </nav>
      </div>
    </header>
  );
}
