import { supabasePublic } from "@/lib/supabase";
import { formatNumber } from "@/lib/format";

interface Stats {
  totalSystems: number;
  affectedPopulation: number;
  pfasCompoundsTracked: number;
}

// Fallback values if the live query fails. Refresh quarterly.
const FALLBACK: Stats = {
  totalSystems: 10_297,
  affectedPopulation: 176_000_000,
  pfasCompoundsTracked: 29,
};

async function loadStats(): Promise<Stats> {
  try {
    // Authoritative system count via PostgREST exact count (head:true avoids
    // pulling rows and bypasses the default 1000-row select cap).
    const { count, error: countErr } = await supabasePublic
      .from("water_systems")
      .select("pwsid", { count: "exact", head: true })
      .not("grade", "is", null);
    if (countErr) return FALLBACK;

    // Population sum requires the actual rows. Page through in 1000-row
    // chunks (Supabase's default max) until we've covered everything.
    const PAGE = 1000;
    const total = count ?? 0;
    let affectedPopulation = 0;
    for (let from = 0; from < total; from += PAGE) {
      const to = Math.min(from + PAGE - 1, total - 1);
      const { data, error } = await supabasePublic
        .from("water_systems")
        .select("population_served")
        .not("grade", "is", null)
        .order("pwsid", { ascending: true })
        .range(from, to);
      if (error || !data) return FALLBACK;
      for (const r of data) {
        affectedPopulation += Number(r.population_served) || 0;
      }
    }

    return {
      totalSystems: total || FALLBACK.totalSystems,
      affectedPopulation: affectedPopulation || FALLBACK.affectedPopulation,
      pfasCompoundsTracked: 29,
    };
  } catch {
    return FALLBACK;
  }
}

function formatBigPopulation(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m >= 100 ? Math.round(m) : m.toFixed(0)}M+`;
  }
  return formatNumber(n);
}

export default async function NationalStatsBar() {
  const stats = await loadStats();
  const items = [
    {
      value: formatBigPopulation(stats.affectedPopulation),
      label: "Americans served by tested systems",
    },
    {
      value: formatNumber(stats.totalSystems),
      label: "Water systems tested",
    },
    {
      value: String(stats.pfasCompoundsTracked),
      label: "PFAS compounds tracked",
    },
  ];

  return (
    <section className="border-y border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <ul className="grid grid-cols-3 gap-4 sm:gap-10">
          {items.map((it) => (
            <li
              key={it.label}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <span className="font-serif text-3xl font-bold text-slate-900 sm:text-5xl">
                {it.value}
              </span>
              <span className="mt-1 max-w-[14rem] font-sans text-xs leading-snug text-slate-600 sm:text-sm">
                {it.label}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-6 font-sans text-xs text-slate-500">
          Source: EPA UCMR 5 (2023&ndash;2026)
        </p>
      </div>
    </section>
  );
}
