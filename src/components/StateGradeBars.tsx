/**
 * Pure server-rendered horizontal bar chart showing the letter-grade
 * distribution for a state. No charting library needed — each bar is a
 * colored div whose width is proportional to its share of the total.
 */
import { GRADE_COLORS } from "@/lib/format";
import type { Grade } from "@/types/database";

interface StateGradeBarsProps {
  counts: Record<Grade, number>;
}

const ORDER: Grade[] = ["A", "B", "C", "D", "F"];

export default function StateGradeBars({ counts }: StateGradeBarsProps) {
  const total = ORDER.reduce((sum, g) => sum + (counts[g] ?? 0), 0);
  if (total === 0) {
    return (
      <p className="mt-6 font-sans text-sm text-slate-500">
        No grades available for this state yet.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {ORDER.map((g) => {
        const count = counts[g] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={g} className="flex items-center gap-4">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-serif text-lg font-bold text-white shadow-sm"
              style={{ backgroundColor: GRADE_COLORS[g] }}
              aria-hidden
            >
              {g}
            </div>
            <div className="flex flex-1 items-center gap-3">
              <div
                className="h-7 rounded-md"
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  backgroundColor: GRADE_COLORS[g],
                  minWidth: count > 0 ? "4px" : "0",
                }}
                role="img"
                aria-label={`Grade ${g}: ${count} systems, ${pct.toFixed(
                  1
                )}%`}
              />
              <span className="font-sans text-sm text-slate-700 tabular-nums">
                {g} — {count.toLocaleString("en-US")}{" "}
                {count === 1 ? "system" : "systems"} ({pct.toFixed(1)}%)
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
