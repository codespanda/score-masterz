import Link from "next/link";
import type { ReactNode } from "react";

/** Friendly empty state: icon, heading, one line of help and a next step. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: "ball" | "team";
  title: string;
  children: ReactNode;
  action?: { label: string; href: string; external?: boolean };
}) {
  const btn = "inline-flex min-h-11 items-center rounded-[10px] bg-pitch px-[18px] font-bold text-white hover:bg-scoreboard";
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-line bg-white px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-pitch-tint" aria-hidden="true">
        {icon === "ball" ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B5D3B" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M7 6c3 3 3 9 0 12M17 6c-3 3-3 9 0 12" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0B5D3B" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c2 .7 3.2 2.4 3.6 5.2" />
          </svg>
        )}
      </span>
      <h2 className="font-display text-2xl font-bold uppercase">{title}</h2>
      <p className="max-w-md text-muted">{children}</p>
      {action &&
        (action.external ? (
          <a href={action.href} className={btn}>{action.label}</a>
        ) : (
          <Link href={action.href} className={btn}>{action.label}</Link>
        ))}
    </div>
  );
}
