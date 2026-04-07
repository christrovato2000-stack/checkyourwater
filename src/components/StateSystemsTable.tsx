"use client";

/**
 * Client-side filterable table of every water system in a state.
 *
 * Renders an input that filters by system name or city name, and
 * collapses long lists behind a "Show all N systems" button. All
 * data comes in as a prop — no network calls.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import GradeCard from "@/components/GradeCard";
import { formatNumber, formatPopulation, formatRatio } from "@/lib/format";
import type { Grade } from "@/types/database";

export interface TableRow {
  pwsid: string;
  system_name: string;
  city: string | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  population_served: number | null;
}

const INITIAL_VISIBLE = 50;

export default function StateSystemsTable({
  rows,
  stateName,
}: {
  rows: TableRow[];
  stateName: string;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      if (r.system_name.toLowerCase().includes(q)) return true;
      if (r.city && r.city.toLowerCase().includes(q)) return true;
      if (r.pwsid.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, query]);

  const visible = showAll || query ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  if (rows.length === 0) {
    return (
      <p className="mt-6 font-sans text-base text-slate-600">
        No UCMR 5 testing results have been published for water systems in{" "}
        {stateName}.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <label className="block">
        <span className="sr-only">Filter systems by city or name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter by city or system name...`}
          className="w-full rounded-md border border-slate-300 bg-white px-4 py-3 font-sans text-base shadow-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:max-w-md"
        />
      </label>

      <p className="mt-2 font-sans text-xs text-slate-500">
        Showing {formatNumber(visible.length)} of {formatNumber(rows.length)} systems
        {query ? ` matching "${query}"` : ""}
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left font-sans text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Grade</th>
              <th scope="col" className="px-4 py-3">System name</th>
              <th scope="col" className="px-4 py-3">City</th>
              <th scope="col" className="px-4 py-3">Worst compound</th>
              <th scope="col" className="px-4 py-3">vs. EPA limit</th>
              <th scope="col" className="px-4 py-3">Population</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.pwsid}
                className="border-t border-slate-200 hover:bg-slate-50"
              >
                <td className="px-4 py-3">
                  <GradeCard grade={r.grade} size="sm" />
                </td>
                <td className="px-4 py-3 font-serif text-base font-semibold text-slate-900">
                  <Link
                    href={`/system/${r.pwsid}`}
                    className="hover:text-blue-600 hover:underline"
                  >
                    {r.system_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.city ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.worst_compound ?? "-"}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {r.worst_ratio !== null
                    ? formatRatio(r.worst_ratio)
                    : "Below detection"}
                </td>
                <td className="px-4 py-3 tabular-nums text-slate-700">
                  {r.population_served
                    ? formatPopulation(r.population_served)
                    : "-"}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center font-sans text-sm text-slate-500"
                >
                  No systems match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && !query && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 font-sans text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
          >
            Show all {formatNumber(rows.length)} systems
          </button>
        </div>
      )}
    </div>
  );
}
