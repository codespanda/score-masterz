import type { ReactNode } from "react";

export const inputClass =
  "min-h-11 w-full rounded-[10px] border border-[#C7D2CA] bg-white px-3 text-[15px] outline-none focus:border-pitch focus:ring-3 focus:ring-pitch/30";
export const labelClass = "flex flex-col gap-1.5 text-[13px] font-medium text-ink-soft";
export const primaryBtn = "min-h-12 w-full rounded-xl bg-pitch text-base font-bold text-white disabled:opacity-50";

/** Centred card used by the login, sign-up and account pages. */
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
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm font-medium ${cls}`}>
      {children}
    </p>
  );
}
