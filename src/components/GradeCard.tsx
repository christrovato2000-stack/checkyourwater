import type { Grade } from "@/types/database";
import {
  formatGradeSummary,
  getGradeColor,
  getGradeTextColor,
} from "@/lib/format";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { box: string; letter: string; label: string }> = {
  sm: { box: "h-10 w-10", letter: "text-xl", label: "text-[10px]" },
  md: { box: "h-16 w-16", letter: "text-3xl", label: "text-xs" },
  lg: { box: "h-24 w-24", letter: "text-5xl", label: "text-sm" },
};

interface GradeCardProps {
  grade: Grade | null | undefined;
  size?: Size;
  showLabel?: boolean;
  className?: string;
}

export default function GradeCard({
  grade,
  size = "md",
  showLabel = false,
  className = "",
}: GradeCardProps) {
  const display = grade ?? "-";
  const bg = grade ? getGradeColor(grade) : "#cbd5e1";
  const fg = getGradeTextColor(grade);
  const sz = SIZES[size];
  const aria = grade
    ? `Grade ${grade}: ${formatGradeSummary(grade)}`
    : "Grade not available";

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      {showLabel && (
        <span
          className={`${sz.label} mb-1 font-sans uppercase tracking-widest text-slate-500`}
        >
          Grade
        </span>
      )}
      <div
        role="img"
        aria-label={aria}
        className={`${sz.box} flex items-center justify-center rounded-md font-serif font-bold leading-none shadow-sm`}
        style={{ backgroundColor: bg, color: fg }}
      >
        <span className={sz.letter}>{display}</span>
      </div>
    </div>
  );
}
