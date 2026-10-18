export function TeamBadge({ code, color, size = 36 }: { code: string; color: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px] font-display font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: Math.round(size * 0.42) }}
    >
      {code}
    </span>
  );
}

export function LiveTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-bold tracking-wider text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
      LIVE
    </span>
  );
}
