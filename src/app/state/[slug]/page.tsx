import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ZipSearch from "@/components/ZipSearch";
import GradeCard from "@/components/GradeCard";
import StateGradeBars from "@/components/StateGradeBars";
import StateSystemsTable from "@/components/StateSystemsTable";
import { getStateBySlug, allStateSlugs } from "@/lib/states";
import { getStateData } from "@/lib/stateData";
import { formatNumber, formatPopulation, formatRatio } from "@/lib/format";
import {
  categoryLabel as newsCategoryLabel,
  formatNewsDate,
} from "@/lib/news";
import type { NewsCategory } from "@/types/database";

export const revalidate = 86400;
export const dynamicParams = false;

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return allStateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const info = getStateBySlug(slug);
  if (!info) {
    return {
      title: "State not found",
      description: "We don't have PFAS data for this state.",
    };
  }
  const data = await getStateData(info.code);
  const total = data?.total_systems ?? 0;
  const exc = data?.systems_with_exceedances ?? 0;
  const pop = data?.population_with_exceedances ?? 0;

  const title = `PFAS Water Contamination in ${info.name} | CheckYourWater`;
  const description = `${formatNumber(total)} water systems tested for PFAS in ${
    info.name
  }. ${formatNumber(exc)} exceed federal limits, affecting ${formatNumber(
    pop
  )} residents. See grades and results for every community.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://checkyourwater.org/state/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: `https://checkyourwater.org/state/${slug}`,
    },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const info = getStateBySlug(slug);
  if (!info) notFound();

  const data = await getStateData(info.code);
  if (!data) notFound();

  const {
    total_systems,
    total_population,
    systems_with_exceedances,
    population_with_exceedances,
    detection_rate,
    exceedance_rate,
    grade_counts,
    worst_systems,
    all_systems,
    most_common_compound,
    cities,
    investigations,
    news,
    legislative,
  } = data;

  const hasExceedances = systems_with_exceedances > 0;
  const citiesWithPages = new Map(cities.map((c) => [c.city_name.toLowerCase(), c]));
  const investigationByCity = new Map(
    investigations
      .filter((i) => i.city_slug)
      .map((i) => [i.city_slug as string, i])
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `PFAS Water Contamination in ${info.name}`,
    url: `https://checkyourwater.org/state/${slug}`,
    description: `${formatNumber(total_systems)} water systems in ${
      info.name
    } tested for PFAS. ${formatNumber(
      systems_with_exceedances
    )} exceed federal limits.`,
    isPartOf: {
      "@type": "WebSite",
      name: "CheckYourWater",
      url: "https://checkyourwater.org",
    },
  };

  return (
    <article className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-sans text-sm text-slate-600">
        <Link href="/states" className="text-blue-700 hover:underline">
          All states
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-900">{info.name}</span>
      </nav>

      {/* HERO */}
      <header className="mt-6">
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          PFAS Testing Results
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          {info.name}
        </h1>
        <p className="mt-4 max-w-[720px] font-serif text-xl leading-snug text-slate-700">
          PFAS testing results for {formatNumber(total_systems)}{" "}
          {total_systems === 1 ? "water system" : "water systems"} serving{" "}
          {formatNumber(total_population)}{" "}
          {total_population === 1 ? "resident" : "residents"}.
        </p>

        {hasExceedances ? (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4"
          >
            <p className="font-sans text-base font-semibold text-red-800">
              {formatNumber(systems_with_exceedances)}{" "}
              {systems_with_exceedances === 1 ? "system exceeds" : "systems exceed"}{" "}
              federal PFAS limits, affecting{" "}
              {formatNumber(population_with_exceedances)}{" "}
              {population_with_exceedances === 1 ? "resident" : "residents"}.
            </p>
          </div>
        ) : total_systems > 0 ? (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-5 py-4">
            <p className="font-sans text-base font-semibold text-green-800">
              No water systems in {info.name} exceeded federal PFAS limits in
              EPA testing.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="font-sans text-base text-slate-700">
              EPA UCMR 5 testing results for {info.name} are still being
              published. Check back as more systems report.
            </p>
          </div>
        )}
      </header>

      {/* KEY STATS ROW */}
      <section className="mt-10" aria-label="Key statistics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Systems tested"
            value={formatNumber(total_systems)}
            sub={`${detection_rate.toFixed(1)}% had PFAS detections`}
          />
          <StatCard
            label="Limits exceeded"
            value={formatNumber(systems_with_exceedances)}
            sub={`${exceedance_rate.toFixed(1)}% of systems`}
            tone={hasExceedances ? "warn" : "default"}
          />
          <StatCard
            label="Population affected"
            value={formatPopulation(population_with_exceedances)}
            sub="served by systems over federal limits"
            tone={hasExceedances ? "warn" : "default"}
          />
          <StatCard
            label="Most common compound"
            value={most_common_compound?.abbrev ?? "-"}
            sub={
              most_common_compound
                ? `detected in ${formatNumber(
                    most_common_compound.systems_detected
                  )} ${
                    most_common_compound.systems_detected === 1
                      ? "system"
                      : "systems"
                  }`
                : "no detections recorded"
            }
          />
        </div>
      </section>

      {/* GRADE DISTRIBUTION */}
      <section className="mt-14">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Grade distribution
        </h2>
        <p className="mt-2 max-w-[720px] font-sans text-base text-slate-600">
          Every water system gets a letter grade based on how its worst
          detected PFAS compound compares to the federal Maximum Contaminant
          Level. Lower grades mean higher contamination.
        </p>
        <StateGradeBars counts={grade_counts} />
        <p className="mt-4 font-sans text-sm">
          <Link
            href="/methodology"
            className="font-semibold text-blue-700 hover:underline"
          >
            How grades are calculated →
          </Link>
        </p>
      </section>

      {/* WORST-AFFECTED COMMUNITIES */}
      {worst_systems.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-3xl font-bold text-slate-900">
            Communities exceeding federal limits
          </h2>
          <p className="mt-2 max-w-[720px] font-sans text-base text-slate-600">
            The water systems in {info.name} where at least one PFAS compound
            exceeds the EPA Maximum Contaminant Level, sorted worst first.
          </p>
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">System name</th>
                  <th scope="col" className="px-4 py-3">City</th>
                  <th scope="col" className="px-4 py-3">Grade</th>
                  <th scope="col" className="px-4 py-3">Worst compound</th>
                  <th scope="col" className="px-4 py-3">Times over limit</th>
                  <th scope="col" className="px-4 py-3">Population</th>
                </tr>
              </thead>
              <tbody>
                {worst_systems.map((s) => {
                  const cityKey = s.city?.toLowerCase() ?? "";
                  const cityPage = citiesWithPages.get(cityKey);
                  const investigation = cityPage
                    ? investigationByCity.get(cityPage.slug)
                    : null;
                  return (
                    <tr
                      key={s.pwsid}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-serif text-base font-semibold text-slate-900">
                        <Link
                          href={`/system/${s.pwsid}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {s.system_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {cityPage ? (
                          <Link
                            href={`/city/${cityPage.slug}`}
                            className="text-blue-700 hover:underline"
                          >
                            {s.city ?? cityPage.city_name}
                          </Link>
                        ) : (
                          s.city ?? "-"
                        )}
                        {investigation && (
                          <div className="mt-1">
                            <Link
                              href={`/blog/${investigation.slug}`}
                              className="font-sans text-xs font-semibold text-blue-700 hover:underline"
                            >
                              Read investigation →
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <GradeCard grade={s.grade} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {s.worst_compound ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-700 tabular-nums">
                        {s.worst_ratio !== null
                          ? `${s.worst_ratio.toFixed(1)}x`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700">
                        {s.population_served
                          ? formatPopulation(s.population_served)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-4 font-sans text-sm text-slate-700">
            Resources for taking action are available in our{" "}
            <Link
              href="/toolkit"
              className="font-semibold text-blue-700 hover:underline"
            >
              community toolkit
            </Link>
            .
          </p>
        </section>
      )}

      {/* LEGISLATIVE CONTENT */}
      <section className="mt-16">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          What {info.name} is doing about PFAS
        </h2>
        <div className="prose-cyw mt-6 max-w-[760px] space-y-4 font-serif text-lg leading-relaxed text-slate-800">
          {legislative.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {legislative.attribution && (
          <p className="mt-4 max-w-[760px] font-sans text-xs italic text-slate-500">
            {legislative.attribution}
          </p>
        )}
      </section>

      {/* ALL SYSTEMS */}
      <section className="mt-16">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          All {formatNumber(total_systems)} tested water{" "}
          {total_systems === 1 ? "system" : "systems"} in {info.name}
        </h2>
        <p className="mt-2 max-w-[720px] font-sans text-base text-slate-600">
          Sorted from lowest grade to highest. Click any system name for the
          full report. Filter by city or name with the search box below.
        </p>
        <StateSystemsTable rows={all_systems} stateName={info.name} />
      </section>

      {/* RELATED CONTENT */}
      {(investigations.length > 0 || news.length > 0 || cities.length > 0) && (
        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="font-serif text-3xl font-bold text-slate-900">
            More on PFAS in {info.name}
          </h2>

          {investigations.length > 0 && (
            <div className="mt-8">
              <h3 className="font-serif text-xl font-semibold text-slate-900">
                Investigations
              </h3>
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {investigations.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/blog/${p.slug}`}
                      className="block h-full rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 hover:shadow-sm"
                    >
                      <p className="font-serif text-lg font-semibold text-slate-900">
                        {p.title}
                      </p>
                      <p className="mt-2 font-sans text-sm text-slate-600">
                        {p.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {news.length > 0 && (
            <div className="mt-10">
              <h3 className="font-serif text-xl font-semibold text-slate-900">
                Recent PFAS news in {info.name}
              </h3>
              <ul className="mt-4 space-y-4">
                {news.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {newsCategoryLabel(n.category as NewsCategory)}
                      </span>
                      <span className="font-sans text-xs text-slate-500">
                        {n.source_name} · {formatNewsDate(n.published_date)}
                      </span>
                    </div>
                    <p className="mt-2 font-serif text-lg font-semibold text-slate-900">
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-700 hover:underline"
                      >
                        {n.title}
                      </a>
                    </p>
                    <p className="mt-1 font-sans text-sm text-slate-600">
                      {n.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cities.length > 0 && (
            <div className="mt-10">
              <h3 className="font-serif text-xl font-semibold text-slate-900">
                City profiles
              </h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cities.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/city/${c.slug}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-blue-400 hover:shadow-sm"
                    >
                      <GradeCard grade={c.grade} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-base font-semibold text-slate-900">
                          {c.city_name}
                        </p>
                        <p className="mt-0.5 font-sans text-xs text-slate-600">
                          {c.worst_compound ? (
                            <>
                              {c.worst_compound}
                              {c.worst_ratio !== null && (
                                <> at {formatRatio(c.worst_ratio)}</>
                              )}
                            </>
                          ) : (
                            "PFAS profile"
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ZIP SEARCH CTA */}
      <section className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-semibold text-slate-900">
          Check your water system
        </h2>
        <p className="mt-2 font-sans text-sm text-slate-600">
          Enter your zip code to see the PFAS results for the water system that
          serves your home.
        </p>
        <div className="mt-5">
          <ZipSearch />
        </div>
      </section>

      {/* DATA SOURCE FOOTER */}
      <section className="mt-16 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-serif text-xl font-semibold text-slate-900">
          Where this data comes from
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 font-sans text-sm leading-relaxed text-slate-700">
          <li>EPA Unregulated Contaminant Monitoring Rule, 5th cycle (UCMR 5)</li>
          <li>Testing period: 2023 to 2026</li>
          <li>
            Federal limits: EPA Maximum Contaminant Levels finalized April 2024
          </li>
          <li>
            <Link
              href="/methodology"
              className="text-blue-700 hover:underline"
            >
              Read the full methodology
            </Link>
          </li>
        </ul>
      </section>
    </article>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "warn";
}) {
  const border =
    tone === "warn" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white";
  return (
    <div className={`rounded-lg border ${border} p-5`}>
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl font-bold text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-2 font-sans text-xs text-slate-600">{sub}</p>
    </div>
  );
}
