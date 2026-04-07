import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GradeCard from "@/components/GradeCard";
import ContaminantRow from "@/components/ContaminantRow";
import ActionsByGrade from "@/components/ActionsByGrade";
import AiDisclaimer from "@/components/AiDisclaimer";
import { loadSystem } from "@/lib/cityData";
import {
  formatGradeSummary,
  formatPopulation,
  formatPPT,
} from "@/lib/format";
import { GRADE_THRESHOLDS } from "@/lib/constants";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { pwsid: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { pwsid } = await params;
  const payload = await loadSystem(pwsid);
  if (!payload) {
    return {
      title: "Water system not found",
      description:
        "We don't have water quality data for this PWSID. Try searching by zip code instead.",
    };
  }
  const { system } = payload;
  const detected = system.compounds.filter((c) => c.detected).length;
  const exc = system.compounds.filter((c) => (c.mcl_ratio ?? 0) >= 1).length;
  const title = `${system.pws_name} — Grade ${
    system.grade ?? "—"
  } for PFAS in Drinking Water`;
  const description = `EPA UCMR 5 testing detected ${detected} PFAS compound${
    detected === 1 ? "" : "s"
  } in ${system.pws_name}. ${exc} above federal limits. PWSID ${system.pwsid}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
    alternates: {
      canonical: `https://checkyourwater.org/system/${system.pwsid}`,
    },
  };
}

export default async function SystemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { pwsid } = await params;
  const payload = await loadSystem(pwsid);
  if (!payload) notFound();

  const { system, fullCompoundTable, citySlug, summary } = payload;
  const detectedCount = system.compounds.filter((c) => c.detected).length;
  const exceedanceCount = system.compounds.filter(
    (c) => (c.mcl_ratio ?? 0) >= 1
  ).length;

  return (
    <article className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 sm:py-16">
      {/* SYSTEM HERO */}
      <header>
        {citySlug && (
          <p className="font-sans text-sm">
            <Link
              href={`/city/${citySlug}`}
              className="text-blue-600 hover:underline"
            >
              ← Back to {system.city_served ?? "city"} report
            </Link>
          </p>
        )}
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
          {system.pws_name}
        </h1>
        <p className="mt-2 font-sans text-base text-slate-600">
          {system.city_served
            ? `${system.city_served}, ${system.state_code}`
            : system.state_code}
        </p>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          <GradeCard grade={system.grade} size="lg" />
          <p className="font-serif text-xl leading-snug text-slate-800 sm:text-2xl">
            {formatGradeSummary(system.grade)}
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-slate-200 py-6 sm:grid-cols-4">
          <Stat
            label="Population served"
            value={
              system.population_served
                ? formatPopulation(system.population_served)
                : "—"
            }
          />
          <Stat label="Source type" value={system.source_type ?? "—"} />
          <Stat label="Compounds detected" value={String(detectedCount)} />
          <Stat label="Above federal limits" value={String(exceedanceCount)} />
        </dl>

        <p className="mt-3 font-sans text-xs text-slate-500">
          PWSID: <span className="tabular-nums">{system.pwsid}</span> · Source:
          EPA UCMR 5
        </p>
      </header>

      {/* FULL COMPOUND TABLE */}
      <section className="mt-14">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Every compound tested
        </h2>
        <p className="mt-2 font-sans text-base text-slate-600">
          All 29 PFAS compounds in the EPA UCMR 5 program. Detected results are
          shown first.
        </p>

        <div className="mt-6">
          {fullCompoundTable.map((c) =>
            c.detected ? (
              <ContaminantRow
                key={c.abbrev}
                compoundName={c.abbrev}
                compoundFullName={c.full_name}
                concentration={c.avg_concentration}
                mcl={c.mcl}
                mclRatio={c.mcl_ratio}
              />
            ) : (
              <NonDetectRow key={c.abbrev} abbrev={c.abbrev} fullName={c.full_name} mcl={c.mcl} />
            )
          )}
        </div>
      </section>

      {/* GRADE METHODOLOGY */}
      <section className="mt-16 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">
          How this grade was calculated
        </h2>
        <p className="mt-3 font-sans text-base leading-relaxed text-slate-700">
          {gradeExplanation(system)}
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse font-sans text-sm">
            <caption className="sr-only">Letter grade rubric</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-600">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Grade
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Criteria
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100">
                <th scope="row" className="py-2 pr-4 font-semibold">A</th>
                <td className="py-2">No PFAS detected above the Minimum Reporting Level</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th scope="row" className="py-2 pr-4 font-semibold">B</th>
                <td className="py-2">PFAS detected, all below 50% of the EPA MCL</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th scope="row" className="py-2 pr-4 font-semibold">C</th>
                <td className="py-2">Worst compound between 50% and 100% of EPA MCL</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th scope="row" className="py-2 pr-4 font-semibold">D</th>
                <td className="py-2">At least one compound exceeds the EPA MCL (up to 5×)</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-4 font-semibold">F</th>
                <td className="py-2">At least one compound exceeds 5× the EPA MCL</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 font-sans text-sm">
          <Link
            href="/methodology"
            className="font-semibold text-blue-600 hover:underline"
          >
            Read the full methodology →
          </Link>
        </p>
      </section>

      {/* AI SUMMARY */}
      {summary ? (
        <section className="mt-16">
          <h2 className="font-serif text-3xl font-bold text-slate-900">
            About PFAS in {system.pws_name}
          </h2>
          <div className="prose-cyw mt-6 font-serif text-lg leading-relaxed text-slate-800">
            {summary.body.split(/\n\n+/).map((p, i) => (
              <p key={i} className="mt-4 first:mt-0">
                {p}
              </p>
            ))}
          </div>
          <AiDisclaimer />
        </section>
      ) : null}

      {/* ACTIONS */}
      <section className="mt-16">
        <ActionsByGrade
          grade={system.grade}
          subject={system.pws_name}
          audience="customers"
        />
      </section>

      {/* DATA SOURCE FOOTER */}
      <section className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">
          Where this data comes from
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-sm leading-relaxed text-slate-700">
          <li>EPA Unregulated Contaminant Monitoring Rule, 5th cycle (UCMR 5)</li>
          <li>Testing period: 2023&ndash;2026</li>
          <li>EPA MCLs finalized April 2024</li>
          <li>
            <Link
              href="/methodology"
              className="text-blue-600 hover:underline"
            >
              Methodology
            </Link>
          </li>
          <li>
            <a
              href="https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View raw EPA UCMR data
            </a>
          </li>
        </ul>
        <p className="mt-4 font-sans text-xs italic leading-relaxed text-slate-600">
          This data reflects EPA testing. Your water utility may have more
          recent results — contact them directly for the most current
          information.
        </p>
      </section>
    </article>
  );
}

function NonDetectRow({
  abbrev,
  fullName,
  mcl,
}: {
  abbrev: string;
  fullName: string;
  mcl: number | null;
}) {
  const slug = abbrev.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-200 py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <Link
            href={`/chemical/${slug}`}
            className="font-sans text-base font-semibold text-slate-700 hover:underline"
          >
            {abbrev}
          </Link>
          <span className="truncate font-sans text-xs text-slate-500">
            {fullName}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 font-sans text-xs font-medium text-slate-500">
        <span aria-hidden>✓</span>
        <span>
          Not detected{mcl ? ` · EPA limit ${formatPPT(mcl)}` : ""}
        </span>
      </div>
    </div>
  );
}

function gradeExplanation(system: {
  grade: import("@/types/database").Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
}): string {
  const wc = system.worst_compound;
  const wr = system.worst_ratio;
  switch (system.grade) {
    case "A":
      return "This system received a grade of A because no PFAS compounds were detected above the EPA Minimum Reporting Level in any UCMR 5 sample.";
    case "B":
      return wc
        ? `This system received a grade of B because PFAS were detected (worst compound: ${wc}) but all detected levels remain below ${
            GRADE_THRESHOLDS.B_UPPER * 100
          }% of the EPA Maximum Contaminant Level.`
        : "This system received a grade of B because PFAS were detected at levels well below the EPA Maximum Contaminant Level.";
    case "C":
      return wc && wr
        ? `This system received a grade of C because ${wc} was detected at ${(
            wr * 100
          ).toFixed(0)}% of the EPA Maximum Contaminant Level — approaching but not yet exceeding the federal limit.`
        : "This system received a grade of C because at least one compound is between 50% and 100% of the EPA Maximum Contaminant Level.";
    case "D":
      return wc && wr
        ? `This system received a grade of D because ${wc} exceeds the EPA Maximum Contaminant Level by ${wr.toFixed(
            1
          )}×.`
        : "This system received a grade of D because at least one PFAS compound exceeds the EPA Maximum Contaminant Level.";
    case "F":
      return wc && wr
        ? `This system received a grade of F because ${wc} exceeds the EPA Maximum Contaminant Level by ${wr.toFixed(
            1
          )}× — more than five times the federal limit.`
        : "This system received a grade of F because at least one compound exceeds five times the EPA Maximum Contaminant Level.";
    default:
      return "This system has not yet been assigned a grade because EPA testing data is incomplete.";
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-xl font-semibold text-slate-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}
