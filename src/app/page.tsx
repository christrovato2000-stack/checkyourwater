import Link from "next/link";
import ZipSearch from "@/components/ZipSearch";
import NationalStatsBar from "@/components/NationalStatsBar";
import GradeCard from "@/components/GradeCard";
import { supabasePublic } from "@/lib/supabase";
import { formatRatio } from "@/lib/format";
import type { Grade } from "@/types/database";

interface CityRow {
  slug: string;
  city_name: string;
  state_code: string;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
}

async function loadLaunchCities(): Promise<CityRow[]> {
  try {
    const { data, error } = await supabasePublic
      .from("cities")
      .select("slug, city_name, state_code, grade, worst_compound, worst_ratio")
      .eq("launch_wave", 1)
      .order("worst_ratio", { ascending: false, nullsFirst: false })
      .limit(10);
    if (error || !data) return [];
    return data as CityRow[];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const cities = await loadLaunchCities();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Check Your Water",
    url: "https://checkyourwater.org",
    description:
      "Free public tool that shows Americans what PFAS chemicals are in their drinking water using EPA data.",
    potentialAction: {
      "@type": "SearchAction",
      target:
        "https://checkyourwater.org/api/search?zip={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* SECTION 1 — HERO */}
      <section className="border-b border-slate-200">
        <div className="mx-auto flex min-h-[70vh] max-w-[1200px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6 sm:py-24 md:min-h-[calc(100vh-62px)]">
          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            What&rsquo;s in your water?
          </h1>
          <div className="mt-10 w-full">
            <ZipSearch />
          </div>
          <p className="mt-6 max-w-md font-sans text-sm text-slate-500">
            Free tool using EPA data. Covers 10,297 water systems serving most
            Americans.
          </p>
        </div>
      </section>

      {/* SECTION 2 — NATIONAL STATS BAR */}
      <NationalStatsBar />

      {/* SECTION 3 — HOW IT WORKS */}
      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <h2 className="mx-auto max-w-[720px] text-center font-serif text-3xl font-bold text-slate-900 sm:text-4xl">
          How it works
        </h2>
        <ol className="mx-auto mt-12 grid max-w-[1000px] gap-10 md:grid-cols-3">
          {[
            {
              n: 1,
              title: "Enter your zip code",
              body: "We look up which water system serves your area using EPA data.",
            },
            {
              n: 2,
              title: "See your grade",
              body: "Every system gets a letter grade (A through F) based on PFAS levels vs federal limits.",
            },
            {
              n: 3,
              title: "Know what to do",
              body: "Get plain-language explanations and specific action steps based on what's in your water.",
            },
          ].map((step) => (
            <li key={step.n} className="flex flex-col items-start">
              <span
                aria-hidden
                className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-900 font-serif text-xl font-bold text-slate-900"
              >
                {step.n}
              </span>
              <h3 className="mt-4 font-serif text-xl font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 font-sans text-base leading-relaxed text-slate-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* SECTION 4 — WHAT ARE PFAS? */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[720px] px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl font-bold text-slate-900 sm:text-4xl">
            What are PFAS?
          </h2>
          <p className="mt-6 font-serif text-lg leading-relaxed text-slate-800">
            PFAS (per- and polyfluoroalkyl substances) are synthetic chemicals
            used since the 1950s in products like non-stick cookware, food
            packaging, stain-resistant fabrics, and firefighting foam.
            They&rsquo;re called &ldquo;forever chemicals&rdquo; because they
            don&rsquo;t break down in the environment or in the human body.
            Research has linked PFAS exposure to health effects including
            certain cancers, thyroid disease, immune system effects, and
            reproductive issues. In 2024, the EPA set the first-ever federal
            limits on PFAS in drinking water.
          </p>
          <Link
            href="/about"
            className="mt-6 inline-block font-sans text-base font-semibold text-blue-600 hover:underline"
          >
            Learn more →
          </Link>
        </div>
      </section>

      {/* SECTION 5 — WORST-AFFECTED CITIES */}
      <section className="mx-auto max-w-[1200px] px-4 py-20 sm:px-6">
        <h2 className="max-w-[720px] font-serif text-3xl font-bold text-slate-900 sm:text-4xl">
          Cities most affected by PFAS contamination
        </h2>
        <p className="mt-3 max-w-[720px] font-sans text-base text-slate-600">
          Communities where EPA testing has found the highest levels of PFAS in
          drinking water.
        </p>

        {cities.length === 0 ? (
          <p className="mt-10 font-sans text-sm text-slate-500">
            City data is loading. Check back soon.
          </p>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/city/${c.slug}`}
                  className="block h-full rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 hover:shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <GradeCard grade={c.grade} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-lg font-semibold text-slate-900">
                        {c.city_name}, {c.state_code}
                      </p>
                      <p className="mt-1 font-sans text-sm text-slate-600">
                        {c.worst_compound ? (
                          <>
                            Worst: <strong>{c.worst_compound}</strong>{" "}
                            {c.worst_ratio !== null && (
                              <>— {formatRatio(Number(c.worst_ratio))}</>
                            )}
                          </>
                        ) : (
                          "PFAS detection details forthcoming"
                        )}
                      </p>
                      <p className="mt-2 font-sans text-sm font-semibold text-blue-600">
                        Read the report →
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
