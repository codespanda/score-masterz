import { textOn } from "@score-masterz/tokens";

export function TeamBadge({
  code,
  color,
  logoUrl,
  size = 36,
}: {
  code: string;
  color: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      // Plain <img>: logos are already optimised WebP and the site is a static export.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[10px] bg-white object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-[10px] font-display font-bold"
      style={{ width: size, height: size, backgroundColor: color, color: textOn(color), fontSize: Math.round(size * 0.42) }}
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
