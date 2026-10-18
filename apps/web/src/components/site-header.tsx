import Link from "next/link";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/matches", label: "Live matches" },
  { href: "/teams", label: "Teams" },
] as const;

export function SiteHeader({ active }: { active: (typeof NAV)[number]["href"] }) {
  return (
    <header className="bg-scoreboard text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="15" fill="#F2B705" />
            <path d="M8 9c5 4 5 12 0 16M26 9c-5 4-5 12 0 16" fill="none" stroke="#08291C" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-display text-[26px] font-bold uppercase tracking-wide">Score Masterz</span>
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === active ? "page" : undefined}
              className={`rounded-lg px-3.5 py-2.5 font-medium ${item.href === active ? "bg-white/10 text-white" : "text-on-board-soft hover:text-white"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {/* The Expo web build is a separate app, so this is a full page load, not a Next link. */}
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/app/`}
          className="inline-flex min-h-11 items-center rounded-[10px] bg-gold px-[18px] font-bold text-scoreboard"
        >
          Open scorer app
        </a>
      </div>
    </header>
  );
}
