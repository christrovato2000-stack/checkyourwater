import type { Metadata } from "next";
import Link from "next/link";
import GradeCard from "@/components/GradeCard";
import { supabasePublic } from "@/lib/supabase";
import { formatPopulation, formatRatio } from "@/lib/format";
import type { Grade } from "@/types/database";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PFAS-Affected Communities | CheckYourWater",
  description:
    "Browse every city CheckYourWater has profiled for PFAS contamination — letter grades, worst compounds, and direct links to each community report.",
  alternates: { canonical: "/cities" },
};

interface CityRow {
  slug: string;
  city_name: string;
  state_code: string;
  state_name: string | null;
  population: number | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_exceedances: number | null;
  launch_wave: number | null;
}

const GRADE_ORDER: Record<string, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };

async function loadCities(): Promise<CityRow[]> {
  try {
    const { data, error } = await supabasePublic
      .from("cities")
      .select(
        "slug, city_name, state_code, state_name, population, grade, worst_compound, worst_ratio, total_exceedances, launch_wave"
      )
      .in("launch_wave", [1, 2]);
    if (error || !data) return [];
    const rows = data as CityRow[];
    rows.sort((a, b) => {
      const ga = GRADE_ORDER[a.grade ?? "A"] ?? 5;
      const gb = GRADE_ORDER[b.grade ?? "A"] ?? 5;
      if (ga !== gb) return ga - gb;
      return (b.worst_ratio ?? 0) - (a.worst_ratio ?? 0);
    });
    return rows;
  } catch {
    return [];
  }
}

export default async function CitiesIndexPage() {
  const cities = await loadCities();
  const states = Array.from(
    new Set(cities.map((c) => c.state_code))
  ).sort();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20">
      <header className="max-w-[760px]">
        <h1 className="font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          PFAS-affected communities
        </h1>
        <p className="mt-4 font-sans text-base leading-relaxed text-slate-600">
          Every city CheckYourWater has profiled for per- and polyfluoroalkyl
          substance (PFAS) contamination, sorted from worst to best grade. Each
          row links to a full community report with EPA testing data, an AI
          summary, and concrete next steps.
        </p>
        <p className="mt-2 font-sans text-sm text-slate-500">
          {cities.length} {cities.length === 1 ? "community" : "communities"}{" "}
          across {states.length} {states.length === 1 ? "state" : "states"}.
        </p>
      </header>

      <div className="mt-10 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">City</th>
              <th scope="col" className="px-4 py-3">State</th>
              <th scope="col" className="px-4 py-3">Grade</th>
              <th scope="col" className="px-4 py-3">Population</th>
              <th scope="col" className="px-4 py-3">Worst compound</th>
              <th scope="col" className="px-4 py-3">vs. EPA limit</th>
              <th scope="col" className="px-4 py-3">Exceedances</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr
                key={c.slug}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-serif text-base font-semibold text-slate-900">
                  <Link
                    href={`/city/${c.slug}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {c.city_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{c.state_code}</td>
                <td className="px-4 py-3">
                  <GradeCard grade={c.grade} size="sm" />
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.population ? formatPopulation(c.population) : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.worst_compound ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.worst_ratio !== null
                    ? formatRatio(Number(c.worst_ratio))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.total_exceedances ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cities.length === 0 && (
        <p className="mt-8 font-sans text-sm text-slate-500">
          City data is loading. Check back soon.
        </p>
      )}
    </main>
  );
}
