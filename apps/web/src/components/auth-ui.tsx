"use client";

import Link from "next/link";
import { useState, type InputHTMLAttributes, type ReactNode } from "react";

export const inputClass =
  "min-h-12 w-full rounded-xl border border-[#C7D2CA] bg-white px-3.5 text-base font-normal outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/30";
export const labelClass = "flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft";
export const primaryBtn = "min-h-[52px] w-full rounded-xl bg-pitch text-base font-bold text-white disabled:opacity-50";
export const outlineBtn = "grid min-h-[52px] w-full place-items-center rounded-xl border border-pitch bg-white font-bold text-pitch";

function Check() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-gold/15">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F2B705" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M5 12l5 5 9-10" />
      </svg>
    </span>
  );
}

const PANELS = {
  login: {
    headline: (
      <>
        Every ball.
        <br />
        <span className="text-gold">Live.</span>
      </>
    ),
    blurb: "Score your club's matches from a phone and follow them anywhere. Your teams, players and results stay with your account.",
  },
  signup: {
    headline: (
      <>
        Your club,
        <br />
        <span className="text-gold">saved.</span>
      </>
    ),
    blurb: "Create a free account to keep everything you score. It takes a minute, and everything you've already set up on this device comes with you.",
  },
} as const;

/** Split layout from the design canvas: brand panel on the left, form on the right (stacks on phones). */
export function AuthLayout({ variant, children }: { variant: keyof typeof PANELS; children: ReactNode }) {
  const panel = PANELS[variant];
  return (
    <div className="flex min-h-screen flex-wrap bg-ground">
      <section aria-label="About Score Masterz" className="flex min-w-0 flex-[1_1_520px] flex-col gap-6 bg-scoreboard px-6 py-8 text-white sm:gap-10 sm:px-12 sm:py-10">
        <Link href="/" className="flex min-h-11 items-center gap-2.5 self-start">
          <svg width="36" height="36" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="15" fill="#F2B705" />
            <path d="M8 9c5 4 5 12 0 16M26 9c-5 4-5 12 0 16" fill="none" stroke="#08291C" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-display text-[26px] font-bold uppercase tracking-wide">Score Masterz</span>
        </Link>
        <div className="flex max-w-[520px] flex-col gap-3.5">
          <h2 className="font-display text-[44px] font-bold uppercase leading-[0.92] sm:text-[72px]">{panel.headline}</h2>
          <p className="hidden text-[17px] leading-relaxed text-on-board-soft sm:block">{panel.blurb}</p>
        </div>
        {variant === "login" ? (
          <ul className="mt-auto hidden flex-col gap-3 sm:flex">
            <li className="flex items-center gap-3"><Check />Score ball by ball from your phone</li>
            <li className="flex items-center gap-3"><Check />Live scorecards on any screen</li>
            <li className="flex items-center gap-3"><Check />Teams and stats saved to your account</li>
          </ul>
        ) : (
          <>
            <div aria-hidden="true" className="hidden max-w-[460px] grid-cols-3 gap-3 sm:grid">
              {[
                ["Teams", "squads, logos, colours"],
                ["Matches", "every ball, every result"],
                ["Any device", "phone, tablet, laptop"],
              ].map(([t, s]) => (
                <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="font-display text-[28px] font-bold leading-tight text-gold">{t}</div>
                  <div className="text-[13px] text-on-board-muted">{s}</div>
                </div>
              ))}
            </div>
            <p className="mt-auto hidden text-[13px] text-on-board-muted sm:block">Player emails you add stay private to your account.</p>
          </>
        )}
      </section>
      <main className="flex min-w-0 flex-[1_1_520px] items-start justify-center px-6 py-8 sm:items-center sm:py-12">
        <div className="flex w-full max-w-[440px] flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-display text-5xl font-bold uppercase leading-none">{title}</h1>
      {children && <p className="leading-relaxed text-muted">{children}</p>}
    </div>
  );
}

/** Password field with a Show/Hide toggle. */
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input {...props} type={show ? "text" : "password"} className={`${inputClass} pr-16`} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute right-1 top-1 h-10 min-w-[52px] rounded-[9px] text-[13px] font-bold text-pitch hover:bg-pitch-tint"
      >
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}

/** Six code boxes over one real input, so typing, pasting and screen readers all work. */
export function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="group relative block">
      <span className="sr-only">{label}</span>
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <span aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`grid h-[60px] place-items-center rounded-xl bg-white font-display text-3xl font-bold ${
              i === Math.min(value.length, 5) ? "border-2 border-pitch ring-pitch/20 group-focus-within:ring-4" : "border border-[#C7D2CA]"
            }`}
          >
            {value[i] ?? ""}
          </span>
        ))}
      </span>
    </label>
  );
}

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const labels = ["Your details", "Verify email", "Password"];
  return (
    <ol aria-label="Sign-up steps" className="grid grid-cols-3 gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n < current ? "done" : n === current ? "current" : "todo";
        return (
          <li key={label} aria-current={state === "current" ? "step" : undefined} className="flex flex-col gap-2">
            <span className={`h-1.5 rounded-full ${state === "todo" ? "bg-line" : state === "done" ? "bg-pitch" : "bg-gold"}`} />
            <span className={`text-[13px] font-bold ${state === "todo" ? "text-muted" : "text-ink"}`}>
              {state === "done" ? "✓ " : `${n}. `}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Centred card, used by the account page. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-5 px-6 pb-16 pt-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[40px] font-bold uppercase leading-none">{title}</h1>
        {subtitle && <p className="text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-6">{children}</div>
    </main>
  );
}

export function Alert({ tone, children }: { tone: "error" | "info" | "success"; children: ReactNode }) {
  const cls =
    tone === "error"
      ? "border-wicket/40 bg-[#FDECEA] text-wicket"
      : tone === "success"
        ? "border-pitch/30 bg-pitch-tint text-pitch"
        : "border-gold/50 bg-gold-tint text-gold-ink";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium leading-snug ${cls}`}>
      {children}
    </p>
  );
}
