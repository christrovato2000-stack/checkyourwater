import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CityMapImage from "@/components/CityMapImage";
import GradeCard from "@/components/GradeCard";
import ContaminantRow from "@/components/ContaminantRow";
import ActionsByGrade from "@/components/ActionsByGrade";
import AiDisclaimer from "@/components/AiDisclaimer";
import { loadCity } from "@/lib/cityData";
import {
  formatGradeSummary,
  formatNumber,
  formatPopulation,
} from "@/lib/format";
import { supabasePublic } from "@/lib/supabase";
import { getPostByCitySlug } from "@/lib/blog";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const { data } = await supabasePublic.from("cities").select("slug");
    return (data ?? []).map((c) => ({ slug: c.slug as string }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await loadCity(slug);
  if (!payload) {
    return {
      title: "City not found",
      description: "We don't have water quality data for this city.",
    };
  }
  const { city, totalDetected, totalExceedances } = payload;
  const title = `${city.city_name}, ${city.state_code}: Grade ${
    city.grade ?? "-"
  } for PFAS in Drinking Water`;
  const description = payload.summary?.body
    ? firstSentence(payload.summary.body)
    : `${city.city_name}, ${city.state_name} water tested positive for ${totalDetected} PFAS compounds. ${totalExceedances} exceed federal limits.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://checkyourwater.org/city/${slug}`,
      type: "article",
      images: [`/api/og?city=${slug}`],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?city=${slug}`],
    },
    alternates: { canonical: `https://checkyourwater.org/city/${slug}` },
  };
}

function firstSentence(s: string): string {
  const m = s.replace(/\s+/g, " ").trim().match(/^(.+?[.!?])(\s|$)/);
  return (m ? m[1] : s).slice(0, 200);
}

export default async function CityPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const payload = await loadCity(slug);
  if (!payload) notFound();

  const {
    city,
    systems,
    summary,
    stateExceedanceCount,
    totalDetected,
    totalExceedances,
    totalPopulation,
  } = payload;

  const investigation = getPostByCitySlug(slug);

  const gradeIsBad = city.grade === "D" || city.grade === "F";

  return (
    <article className="mx-auto max-w-[900px] px-4 py-12 sm:px-6 sm:py-16">
      {/* SECTION 1: HERO */}
      <header>
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          {city.state_name}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {city.city_name}
        </h1>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
          <GradeCard grade={city.grade} size="lg" />
          <p className="font-serif text-xl leading-snug text-slate-800 sm:text-2xl">
            {formatGradeSummary(city.grade)}
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-y border-slate-200 py-6 sm:grid-cols-4">
          <Stat label="Population served" value={formatPopulation(totalPopulation || null)} />
          <Stat label="Systems tested" value={formatNumber(systems.length)} />
          <Stat label="Compounds detected" value={formatNumber(totalDetected)} />
          <Stat
            label="Above federal limits"
            value={formatNumber(totalExceedances)}
          />
        </dl>

        <p className="mt-4 font-sans text-xs text-slate-500">
          Source: EPA UCMR 5 · Samples collected 2023&ndash;2026
        </p>

        <CityMapImage
          slug={slug}
          cityName={city.city_name}
          stateName={city.state_name}
          grade={city.grade}
        />

        {investigation && (
          <div className="mt-8 rounded-lg border-l-4 border-blue-600 bg-blue-50 px-5 py-4">
            <p className="font-sans text-xs font-semibold uppercase tracking-widest text-blue-700">
              Read the full investigation
            </p>
            <Link
              href={`/blog/${investigation.frontmatter.slug}`}
              className="mt-1 block font-serif text-xl font-semibold text-slate-900 hover:text-blue-700 hover:underline"
            >
              {investigation.frontmatter.title}
            </Link>
            <p className="mt-2 font-sans text-sm text-slate-700">
              {investigation.frontmatter.description}
            </p>
          </div>
        )}
      </header>

      {/* SECTION 2: CONTAMINATION SUMMARY */}
      <section className="mt-14">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          What was found in {city.city_name}&rsquo;s water
        </h2>

        {gradeIsBad && totalExceedances > 0 && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="font-sans text-base font-semibold text-red-800">
              {totalExceedances} PFAS{" "}
              {totalExceedances === 1 ? "compound exceeds" : "compounds exceed"}{" "}
              federal drinking water limits in {city.city_name}&rsquo;s water
              supply.
            </p>
          </div>
        )}

        {systems.length === 0 ? (
          <p className="mt-6 font-sans text-base text-slate-600">
            We were unable to load detection records for this city. The EPA may
            not have published testing data for its serving water systems yet.
          </p>
        ) : (
          systems.map((s, i) => {
            const detected = s.compounds.filter((c) => c.detected);
            return (
              <section
                key={s.pwsid}
                className={`${
                  i === 0 ? "mt-8" : "mt-12 border-t border-slate-200 pt-12"
                }`}
                aria-labelledby={`sys-${s.pwsid}`}
              >
                <div className="flex items-start gap-4">
                  <GradeCard grade={s.grade} size="sm" />
                  <div className="min-w-0 flex-1">
                    <h3
                      id={`sys-${s.pwsid}`}
                      className="font-serif text-2xl font-semibold text-slate-900"
                    >
                      <Link
                        href={`/system/${s.pwsid}`}
                        className="hover:underline"
                      >
                        {s.pws_name}
                      </Link>
                    </h3>
                    <p className="mt-1 font-sans text-sm text-slate-600">
                      {s.population_served
                        ? `Serves ${formatPopulation(s.population_served)} people`
                        : "Population not reported"}
                      {s.source_type ? ` · ${s.source_type}` : ""}
                    </p>
                  </div>
                </div>

                {detected.length === 0 ? (
                  <p className="mt-6 font-sans text-base text-slate-700">
                    No PFAS detected above the EPA Minimum Reporting Level in
                    this system&rsquo;s UCMR 5 testing.
                  </p>
                ) : (
                  <div className="mt-4">
                    {s.compounds.map((c) => (
                      <ContaminantRow
                        key={c.abbrev}
                        compoundName={c.abbrev}
                        compoundFullName={c.full_name}
                        concentration={c.avg_concentration}
                        mcl={c.mcl}
                        mclRatio={c.mcl_ratio}
                      />
                    ))}
                  </div>
                )}

                <p className="mt-4 font-sans text-sm">
                  <Link
                    href={`/system/${s.pwsid}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    View full system report →
                  </Link>
                </p>
              </section>
            );
          })
        )}
      </section>

      {/* SECTION 3: AI SUMMARY */}
      <section className="mt-16">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          About PFAS contamination in {city.city_name}
        </h2>
        {summary ? (
          <>
            <div className="prose-cyw mt-6 font-serif text-lg leading-relaxed text-slate-800">
              {summary.body.split(/\n\n+/).map((p, i) => (
                <p key={i} className="mt-4 first:mt-0">
                  {p}
                </p>
              ))}
            </div>
            <AiDisclaimer />
          </>
        ) : (
          <p className="mt-6 font-sans text-base leading-relaxed text-slate-700">
            Detailed analysis coming soon. The data above is from EPA UCMR 5
            testing conducted between 2023 and 2026.
          </p>
        )}
      </section>

      {/* SECTION 4: WHAT YOU CAN DO */}
      <section className="mt-16">
        <ActionsByGrade
          grade={city.grade}
          subject={city.city_name}
          audience="residents"
        />

        {(city.contamination_source || city.settlement_status) && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 font-sans text-sm leading-relaxed text-slate-700">
            {city.contamination_source && (
              <p>
                <span className="font-semibold text-slate-900">
                  Primary contamination source:
                </span>{" "}
                {city.contamination_source}
              </p>
            )}
            {city.settlement_status && (
              <p className="mt-2">
                <span className="font-semibold text-slate-900">
                  Settlement information:
                </span>{" "}
                {city.settlement_status}
              </p>
            )}
          </div>
        )}
      </section>

      {/* SECTION 5: CONTEXT */}
      <section className="mt-16">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          How {city.city_name} compares
        </h2>
        {stateExceedanceCount && stateExceedanceCount > 0 ? (
          <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
            {city.city_name} is one of {formatNumber(stateExceedanceCount)}{" "}
            {stateExceedanceCount === 1 ? "community" : "communities"} we track
            in {city.state_name} where PFAS levels exceed federal limits.
          </p>
        ) : (
          <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
            {city.city_name} is part of our launch coverage of communities
            where EPA UCMR 5 testing has detected PFAS in drinking water.
          </p>
        )}
      </section>

      {/* SECTION 6: DATA TRANSPARENCY */}
      <section className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">
          Where this data comes from
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-sm leading-relaxed text-slate-700">
          <li>
            Testing program: EPA Unregulated Contaminant Monitoring Rule, 5th
            cycle (UCMR 5)
          </li>
          <li>Testing period: 2023&ndash;2026</li>
          <li>
            Federal limits: EPA Maximum Contaminant Levels (MCLs) finalized
            April 2024
          </li>
          <li>
            Methodology:{" "}
            <Link
              href="/methodology"
              className="text-blue-600 hover:underline"
            >
              Read how we calculate grades
            </Link>
          </li>
          <li>
            Raw EPA data:{" "}
            <a
              href="https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EPA UCMR Occurrence Data
            </a>
          </li>
        </ul>
        <p className="mt-4 font-sans text-xs italic leading-relaxed text-slate-600">
          This data reflects EPA testing. Your water utility may have more
          recent results. Contact them directly for the most current
          information.
        </p>
      </section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-2xl font-semibold text-slate-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}
