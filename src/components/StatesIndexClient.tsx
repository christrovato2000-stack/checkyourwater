"use client";

/**
 * Client-side sortable list of all 50 states + DC.
 *
 * Three sort modes: alphabetical, exceedance count, population affected.
 * Each row links to the corresponding /state/[slug] page.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatNumber, formatPopulation } from "@/lib/format";
import type { Grade } from "@/types/database";

export interface StateIndexRow {
  slug: string;
  name: string;
  code: string;
  total_systems: number;
  systems_with_exceedances: number;
  population_with_exceedances: number;
  grade_counts: Record<Grade, number>;
}

type SortMode = "alpha" | "exceedances" | "population";

const SORTS: { value: SortMode; label: string }[] = [
  { value: "alpha", label: "Alphabetical" },
  { value: "exceedances", label: "Exceedances (worst first)" },
  { value: "population", label: "Population affected (worst first)" },
];

export default function StatesIndexClient({
  rows,
}: {
  rows: StateIndexRow[];
}) {
  const [sort, setSort] = useState<SortMode>("alpha");

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === "alpha") {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "exceedances") {
      copy.sort((a, b) => {
        if (b.systems_with_exceedances !== a.systems_with_exceedances) {
          return b.systems_with_exceedances - a.systems_with_exceedances;
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      copy.sort((a, b) => {
        if (b.population_with_exceedances !== a.population_with_exceedances) {
          return b.population_with_exceedances - a.population_with_exceedances;
        }
        return a.name.localeCompare(b.name);
      });
    }
    return copy;
  }, [rows, sort]);

  return (
    <div>
      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
          Sort by
        </span>
        {SORTS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSort(s.value)}
            aria-pressed={sort === s.value}
            className={`rounded-md border px-3 py-1.5 font-sans text-sm font-semibold transition-colors ${
              sort === s.value
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">State</th>
              <th scope="col" className="px-4 py-3">Systems tested</th>
              <th scope="col" className="px-4 py-3">Exceedances</th>
              <th scope="col" className="px-4 py-3">Population affected</th>
              <th scope="col" className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr
                key={s.slug}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-serif text-base font-semibold text-slate-900">
                  <Link
                    href={`/state/${s.slug}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">
                  {formatNumber(s.total_systems)}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.systems_with_exceedances > 0 ? (
                    <span className="font-semibold text-red-700">
                      {formatNumber(s.systems_with_exceedances)}
                    </span>
                  ) : (
                    <span className="text-slate-500">0</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">
                  {s.population_with_exceedances > 0
                    ? formatPopulation(s.population_with_exceedances)
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/state/${s.slug}`}
                    className="font-semibold text-blue-700 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
