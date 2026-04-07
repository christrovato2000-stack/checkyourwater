import Link from "next/link";
import { formatPPT, formatRatio } from "@/lib/format";

interface ContaminantRowProps {
  compoundName: string;
  compoundFullName: string;
  concentration: number | null;
  mcl: number | null;
  mclRatio: number | null;
}

/**
 * One detected PFAS compound rendered as a labeled bar showing concentration
 * relative to the EPA MCL. Bar fill colors are reinforced with text + icons
 * so the meaning isn't carried by color alone.
 */
export default function ContaminantRow({
  compoundName,
  compoundFullName,
  concentration,
  mcl,
  mclRatio,
}: ContaminantRowProps) {
  const hasMcl = mcl !== null && mcl > 0;
  const conc = concentration ?? 0;

  // Status (over / approaching / under)
  let status: "over" | "approaching" | "under" | "none" = "none";
  let fillColor = "#94a3b8";
  let icon = "•";
  let statusText = "No federal limit established";

  if (hasMcl) {
    const ratio = mclRatio ?? (mcl ? conc / mcl : 0);
    // Colors are tuned for WCAG AA against white (these values double as
    // status text colors on a white card background).
    if (ratio >= 1) {
      status = "over";
      fillColor = "#b91c1c";
      icon = "✗";
      statusText = formatRatio(ratio);
    } else if (ratio >= 0.5) {
      status = "approaching";
      fillColor = "#c2410c";
      icon = "⚠";
      statusText = formatRatio(ratio);
    } else {
      status = "under";
      fillColor = "#15803d";
      icon = "✓";
      statusText = "Below federal limit";
    }
  }

  // Bar width: clamp to 0..100% of MCL marker. The MCL marker sits at 50% of
  // the bar width, so 1× MCL = 50% fill, 2× MCL = 100% fill.
  let fillPct = 0;
  if (hasMcl) {
    const ratio = mclRatio ?? (mcl ? conc / mcl : 0);
    fillPct = Math.min(100, ratio * 50);
  }

  return (
    <div className="border-b border-slate-200 py-4 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/chemical/${compoundName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`}
              className="font-sans text-base font-semibold text-slate-900 hover:underline"
            >
              {compoundName}
            </Link>
            <span className="truncate font-sans text-xs text-slate-500">
              {compoundFullName}
            </span>
          </div>
          <div className="mt-0.5 font-sans text-sm tabular-nums text-slate-700">
            {formatPPT(concentration)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 font-sans text-xs font-medium" style={{ color: hasMcl ? fillColor : "#64748b" }}>
          <span aria-hidden>{icon}</span>
          <span>{statusText}</span>
        </div>
      </div>

      {hasMcl && (
        <div className="mt-3">
          <div
            className="relative h-2 w-full rounded-full bg-slate-200"
            role="presentation"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ width: `${fillPct}%`, backgroundColor: fillColor }}
            />
            {/* MCL marker at 50% */}
            <div
              className="absolute -top-1 -bottom-1 w-px bg-slate-900"
              style={{ left: "50%" }}
              aria-hidden
            />
          </div>
          <div className="mt-1 flex justify-between font-sans text-[10px] uppercase tracking-wide text-slate-500">
            <span>0</span>
            <span>EPA limit ({formatPPT(mcl)})</span>
            <span>2× limit</span>
          </div>
        </div>
      )}
      {!hasMcl && status === "none" && (
        <p className="mt-1 font-sans text-xs italic text-slate-500">
          This compound is monitored under UCMR 5 but has no enforceable EPA
          drinking water limit yet.
        </p>
      )}
    </div>
  );
}
