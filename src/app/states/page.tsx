import type { Metadata } from "next";
import StatesIndexClient, {
  type StateIndexRow,
} from "@/components/StatesIndexClient";
import { getAllStateSummaries } from "@/lib/stateData";
import { formatNumber, formatPopulation } from "@/lib/format";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PFAS Testing Results by State | CheckYourWater",
  description:
    "EPA tested over 10,000 water systems nationwide for PFAS. Browse results by state with grade distributions, exceedances, and population affected.",
  alternates: { canonical: "https://checkyourwater.org/states" },
  openGraph: {
    title: "PFAS Testing Results by State | CheckYourWater",
    description:
      "Browse EPA UCMR 5 PFAS results for every U.S. state. See how many water systems exceed federal limits and how many residents are affected.",
    url: "https://checkyourwater.org/states",
    type: "website",
  },
};

export default async function StatesIndexPage() {
  const summaries = await getAllStateSummaries();

  const rows: StateIndexRow[] = summaries.map((s) => ({
    slug: s.info.slug,
    name: s.info.name,
    code: s.info.code,
    total_systems: s.total_systems,
    systems_with_exceedances: s.systems_with_exceedances,
    population_with_exceedances: s.population_with_exceedances,
    grade_counts: s.grade_counts,
  }));

  const totalSystems = rows.reduce((sum, r) => sum + r.total_systems, 0);
  const totalExceedances = rows.reduce(
    (sum, r) => sum + r.systems_with_exceedances,
    0
  );
  const totalPop = rows.reduce(
    (sum, r) => sum + r.population_with_exceedances,
    0
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "PFAS Testing Results by State",
    url: "https://checkyourwater.org/states",
    description:
      "EPA UCMR 5 PFAS results for all 50 U.S. states and the District of Columbia.",
  };

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="max-w-[760px]">
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          By State
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          PFAS Testing Results by State
        </h1>
        <p className="mt-4 font-serif text-xl leading-snug text-slate-700">
          EPA tested over {formatNumber(totalSystems)} water systems nationwide
          for PFAS. Browse results by state to see which communities exceed
          federal limits and how much of your state&rsquo;s population is
          affected.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-slate-200 py-6 sm:grid-cols-3">
          <div>
            <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
              States + DC
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-slate-900 tabular-nums">
              {rows.length}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
              Systems exceeding limits
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-red-700 tabular-nums">
              {formatNumber(totalExceedances)}
            </dd>
          </div>
          <div>
            <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
              Population affected
            </dt>
            <dd className="mt-1 font-serif text-2xl font-semibold text-slate-900 tabular-nums">
              {formatPopulation(totalPop)}
            </dd>
          </div>
        </dl>
      </header>

      <StatesIndexClient rows={rows} />

      <p className="mt-10 max-w-[760px] font-sans text-sm leading-relaxed text-slate-600">
        Exceedance counts include water systems where the worst detected PFAS
        compound is above the federal EPA Maximum Contaminant Level. Systems
        still awaiting EPA UCMR 5 publication are not yet included.
      </p>
    </main>
  );
}
