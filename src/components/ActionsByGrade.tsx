import Link from "next/link";
import type { Grade } from "@/types/database";

interface ActionsByGradeProps {
  grade: Grade | null;
  /** Display name (city or system) used in the heading and intro line. */
  subject: string;
  /** "residents" for cities, "customers" for systems. */
  audience?: "residents" | "customers";
}

/**
 * Grade-aware action recommendations. Shown on both city and system pages.
 * Always links out to /action for the full guide.
 */
export default function ActionsByGrade({
  grade,
  subject,
  audience = "residents",
}: ActionsByGradeProps) {
  const intro = introLine(grade, subject, audience);
  const items = bulletsForGrade(grade);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-serif text-2xl font-semibold text-slate-900">
        What {subject} {audience} can do
      </h2>
      <p className="mt-3 font-sans text-base leading-relaxed text-slate-700">
        {intro}
      </p>
      <ul className="mt-5 list-disc space-y-2 pl-5 font-sans text-base leading-relaxed text-slate-700">
        {items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
      <p className="mt-6 font-sans text-sm">
        <Link
          href="/action"
          className="font-semibold text-blue-600 hover:underline"
        >
          Read the full action guide →
        </Link>
      </p>
    </div>
  );
}

function introLine(
  grade: Grade | null,
  subject: string,
  audience: "residents" | "customers"
): string {
  switch (grade) {
    case "A":
      return `${subject}'s water meets federal PFAS standards based on EPA UCMR 5 testing. To stay informed:`;
    case "B":
      return `PFAS were detected in ${subject}'s water but levels are well below federal limits. Steps to maintain awareness:`;
    case "C":
      return `${subject}'s water is approaching federal PFAS limits. Consider these steps:`;
    case "D":
    case "F":
      return `${subject}'s water exceeds federal PFAS limits. We recommend ${audience} take action:`;
    default:
      return `General steps any drinking water customer can take:`;
  }
}

function bulletsForGrade(grade: Grade | null): string[] {
  if (grade === "A" || grade === "B") {
    return [
      "Read your utility's annual Consumer Confidence Report (CCR) — request a copy if you don't receive one.",
      "Sign up for water quality alerts from your utility.",
      "If you're on a private well, get it independently tested for PFAS.",
      "Reduce PFAS exposure from non-water sources: avoid non-stick cookware, stain-resistant fabrics, and grease-resistant food packaging.",
    ];
  }
  if (grade === "C") {
    return [
      "Install a water filter certified to NSF/ANSI Standard 53 or 58 for PFAS reduction. Activated carbon pitchers or under-sink reverse osmosis systems both work.",
      "Request your utility's most recent Consumer Confidence Report and ask specifically about PFAS testing.",
      "Ask your utility what treatment changes are planned to reduce PFAS levels.",
      "Sign up for water quality alerts and follow your utility's compliance reporting.",
    ];
  }
  // D / F
  return [
    "Install a reverse osmosis (RO) or activated-carbon water filter certified to NSF/ANSI Standard 53 or 58 for PFAS reduction. RO systems remove the widest range of PFAS compounds.",
    "Do NOT boil your water to remove PFAS — boiling concentrates them.",
    "Request your most recent Consumer Confidence Report from your utility and ask when PFAS treatment will be installed.",
    "Contact your local elected officials and water utility board to demand a remediation timeline.",
    "Get independent water testing through services like Tap Score (mytapscore.com) if you want to verify your in-home levels.",
    "Talk to your healthcare provider about PFAS exposure — especially if you are pregnant, nursing, or have young children.",
  ];
}
