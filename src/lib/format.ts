/**
 * Formatting helpers for concentrations, ratios, and grades.
 * Concentrations are always in parts per trillion (ppt).
 */
import type { Grade } from "@/types/database";

export function formatPPT(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value === 0) return "<MRL";
  if (value < 1) return `${value.toFixed(2)} ppt`;
  if (value < 10) return `${value.toFixed(1)} ppt`;
  return `${Math.round(value).toLocaleString()} ppt`;
}

export function formatRatio(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return "No federal limit";
  if (ratio >= 1) return `${ratio.toFixed(1)}× the federal limit`;
  if (ratio >= 0.5) return `${(ratio * 100).toFixed(0)}% of federal limit`;
  return "Below federal limit";
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("en-US");
}

export function formatPopulation(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString("en-US");
}

// Grade colors are tuned so white text on the swatch meets WCAG AA
// (4.5:1 for normal text). The lime/yellow that Tailwind ships at the
// "natural" grade hues fail badly against white, so B and C are darkened
// to a depth where contrast clears the bar while still reading as
// lime-green / mustard-yellow within the A→F gradient.
export const GRADE_COLORS: Record<Grade, string> = {
  A: "#15803d", // green-700,  5.14:1 vs white
  B: "#4d7c0f", // lime-700,   5.46:1 vs white
  C: "#a16207", // yellow-700, 4.83:1 vs white
  D: "#c2410c", // orange-700, 5.27:1 vs white
  F: "#b91c1c", // red-700,    6.36:1 vs white
};

export function getGradeColor(grade: Grade | string | null | undefined): string {
  if (!grade) return "#4a5568";
  return GRADE_COLORS[grade as Grade] ?? "#4a5568";
}

/**
 * All five grade colors meet WCAG AA contrast for large white text on the
 * solid swatch, so we always use white text inside grade chips.
 */
export function getGradeTextColor(_grade: Grade | string | null | undefined): string {
  return "#ffffff";
}

export function formatGradeSummary(grade: Grade | string | null | undefined): string {
  switch (grade) {
    case "A":
      return "Good news: No PFAS detected above reporting limits in your water system.";
    case "B":
      return "PFAS detected in your water, but all levels are below 50% of federal limits.";
    case "C":
      return "PFAS detected and approaching federal limits. Consider installing a water filter.";
    case "D":
      return "Your water system exceeds federal PFAS limits. We recommend taking action.";
    case "F":
      return "Your water system significantly exceeds federal PFAS limits. Immediate action recommended.";
    default:
      return "We don't have a grade for this water system yet.";
  }
}

export function gradeAriaLabel(grade: Grade | string | null | undefined): string {
  if (!grade) return "Grade not available";
  return `Grade: ${grade}, ${formatGradeSummary(grade)}`;
}
