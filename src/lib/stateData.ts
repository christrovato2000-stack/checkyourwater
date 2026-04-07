/**
 * Server-side data loader for /state/[slug] pages.
 *
 * Aggregates UCMR 5 water-system data for a given state code and returns
 * a single payload used by the state page. Aggregation is done in
 * TypeScript after a small number of Supabase queries because 50 states
 * fit comfortably in build memory.
 *
 * Performance note: the two main queries are
 *   1. water_systems.select(...).eq("state_code", code) — capped at 10k rows
 *   2. detections.select(...).in("pwsid", [...]) — batched in groups of 200
 * Both are called once per state at build time.
 */
import { supabasePublic } from "@/lib/supabase";
import { getStateByCode, type StateInfo } from "@/lib/states";
import type { Grade } from "@/types/database";
import stateContentRaw from "../../content/state-content.json";
const stateContent = stateContentRaw as unknown as Record<
  string,
  { paragraphs?: string[]; attribution?: string | null } | undefined
>;

export interface StateSystemRow {
  pwsid: string;
  system_name: string;
  city: string | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  population_served: number | null;
}

export interface StateCityLink {
  slug: string;
  city_name: string;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  population: number | null;
}

export interface StateBlogLink {
  slug: string;
  title: string;
  description: string;
  date: string;
  city_slug: string | null;
}

export interface StateNewsLink {
  id: string;
  title: string;
  url: string;
  source_name: string;
  summary: string;
  published_date: string;
  category: string;
}

export interface StateLegislativeContent {
  /** Paragraphs in reading order. */
  paragraphs: string[];
  /** One-line source tag. May be null. */
  attribution: string | null;
}

export interface StateDataPayload {
  info: StateInfo;

  // Aggregate stats
  total_systems: number;
  total_population: number;
  systems_with_detections: number;
  systems_with_exceedances: number;
  population_with_exceedances: number;
  detection_rate: number; // 0-100
  exceedance_rate: number; // 0-100

  // Grade counts
  grade_counts: Record<Grade, number>;

  // Worst systems (top 10 by worst_ratio, only those with exceedances)
  worst_systems: StateSystemRow[];

  // All systems sorted by grade severity
  all_systems: StateSystemRow[];

  // Most commonly detected compound across this state
  most_common_compound: {
    abbrev: string;
    systems_detected: number;
  } | null;

  // Related content
  cities: StateCityLink[];
  investigations: StateBlogLink[];
  news: StateNewsLink[];

  // Legislative content for the "What [State] is doing about PFAS" section
  legislative: StateLegislativeContent;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const GRADE_ORDER: Grade[] = ["F", "D", "C", "B", "A"];
const GRADE_RANK: Record<Grade, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };

function fallbackLegislative(stateName: string): StateLegislativeContent {
  return {
    paragraphs: [
      `As of April 2026, ${stateName} has not adopted state-level PFAS drinking water standards beyond the federal EPA limits finalized in April 2024. Water systems in ${stateName} are subject to the federal compliance timeline requiring initial monitoring by 2027 and treatment installation by 2029.`,
      `Public water systems serving more than 3,300 residents must test for the six regulated PFAS compounds and publish results in annual Consumer Confidence Reports. Residents can request recent testing data directly from their utility.`,
    ],
    attribution: null,
  };
}

function loadLegislative(code: string, stateName: string): StateLegislativeContent {
  const entry = stateContent[code];
  if (!entry || !Array.isArray(entry.paragraphs) || entry.paragraphs.length === 0) {
    return fallbackLegislative(stateName);
  }
  return {
    paragraphs: entry.paragraphs,
    attribution: entry.attribution ?? null,
  };
}

/**
 * Fetch every water_system row for a single state. Paginated because
 * Supabase caps responses at 1000 rows by default and California/Texas
 * exceed that.
 */
async function fetchStateSystems(stateCode: string): Promise<
  Array<{
    pwsid: string;
    pws_name: string;
    city_served: string | null;
    population_served: number | null;
    grade: Grade | null;
    worst_compound: string | null;
    worst_ratio: number | null;
    total_pfas_detected: number;
  }>
> {
  const all: Array<{
    pwsid: string;
    pws_name: string;
    city_served: string | null;
    population_served: number | null;
    grade: Grade | null;
    worst_compound: string | null;
    worst_ratio: number | null;
    total_pfas_detected: number;
  }> = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabasePublic
      .from("water_systems")
      .select(
        "pwsid, pws_name, city_served, population_served, grade, worst_compound, worst_ratio, total_pfas_detected"
      )
      .eq("state_code", stateCode)
      .order("pwsid")
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error(`[stateData] fetchStateSystems ${stateCode}:`, error.message);
      break;
    }
    const rows = data ?? [];
    for (const r of rows) {
      all.push({
        pwsid: r.pwsid as string,
        pws_name: r.pws_name as string,
        city_served: (r.city_served as string | null) ?? null,
        population_served: num(r.population_served),
        grade: ((r.grade as string | null) ?? null) as Grade | null,
        worst_compound: (r.worst_compound as string | null) ?? null,
        worst_ratio: num(r.worst_ratio),
        total_pfas_detected: Number(r.total_pfas_detected ?? 0),
      });
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (offset > 50_000) break; // safety stop
  }
  return all;
}

/**
 * Find the most commonly detected PFAS compound across the given water
 * system ids. Returns the abbreviation and the number of distinct systems
 * it was detected in.
 */
async function findMostCommonCompound(
  pwsids: string[]
): Promise<{ abbrev: string; systems_detected: number } | null> {
  if (pwsids.length === 0) return null;
  const systemCountByCompound = new Map<string, Set<string>>();
  const BATCH = 200;
  for (let i = 0; i < pwsids.length; i += BATCH) {
    const batch = pwsids.slice(i, i + BATCH);
    const { data, error } = await supabasePublic
      .from("detections")
      .select("pwsid, compound_abbrev")
      .in("pwsid", batch);
    if (error) {
      console.error("[stateData] findMostCommonCompound:", error.message);
      continue;
    }
    for (const row of data ?? []) {
      const abbrev = row.compound_abbrev as string;
      const pwsid = row.pwsid as string;
      if (!abbrev) continue;
      let set = systemCountByCompound.get(abbrev);
      if (!set) {
        set = new Set();
        systemCountByCompound.set(abbrev, set);
      }
      set.add(pwsid);
    }
  }

  let best: { abbrev: string; systems_detected: number } | null = null;
  for (const [abbrev, set] of systemCountByCompound.entries()) {
    if (!best || set.size > best.systems_detected) {
      best = { abbrev, systems_detected: set.size };
    }
  }
  return best;
}

async function fetchCitiesForState(
  stateCode: string
): Promise<StateCityLink[]> {
  try {
    const { data, error } = await supabasePublic
      .from("cities")
      .select(
        "slug, city_name, grade, worst_compound, worst_ratio, population, launch_wave"
      )
      .eq("state_code", stateCode)
      .in("launch_wave", [1, 2]);
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map((c) => ({
      slug: c.slug as string,
      city_name: c.city_name as string,
      grade: ((c.grade as string | null) ?? null) as Grade | null,
      worst_compound: (c.worst_compound as string | null) ?? null,
      worst_ratio: num(c.worst_ratio),
      population: num(c.population),
    }));
  } catch {
    return [];
  }
}

async function fetchNewsForState(
  stateCode: string
): Promise<StateNewsLink[]> {
  try {
    const { data, error } = await supabasePublic
      .from("news_items")
      .select(
        "id, title, url, source_name, summary, published_date, category"
      )
      .eq("status", "published")
      .eq("state", stateCode)
      .order("published_date", { ascending: false })
      .limit(10);
    if (error || !data) return [];
    return data.map((n) => ({
      id: n.id as string,
      title: n.title as string,
      url: n.url as string,
      source_name: n.source_name as string,
      summary: n.summary as string,
      published_date: n.published_date as string,
      category: n.category as string,
    }));
  } catch {
    return [];
  }
}

/**
 * Load every piece of data the state page needs. Expects the 2-letter
 * state code (e.g. "MI"). Returns null if the code is not recognized.
 */
export async function getStateData(
  stateCode: string
): Promise<StateDataPayload | null> {
  const info = getStateByCode(stateCode);
  if (!info) return null;

  const systems = await fetchStateSystems(info.code);

  // Aggregate stats
  let total_population = 0;
  let systems_with_detections = 0;
  let systems_with_exceedances = 0;
  let population_with_exceedances = 0;

  const grade_counts: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const s of systems) {
    total_population += s.population_served ?? 0;
    if ((s.total_pfas_detected ?? 0) > 0) systems_with_detections++;
    const exceeds = (s.worst_ratio ?? 0) > 1.0;
    if (exceeds) {
      systems_with_exceedances++;
      population_with_exceedances += s.population_served ?? 0;
    }
    if (s.grade && grade_counts[s.grade] !== undefined) {
      grade_counts[s.grade]++;
    }
  }

  const total_systems = systems.length;
  const detection_rate =
    total_systems > 0 ? (systems_with_detections / total_systems) * 100 : 0;
  const exceedance_rate =
    total_systems > 0 ? (systems_with_exceedances / total_systems) * 100 : 0;

  // Worst systems (only those with exceedances)
  const worst_systems: StateSystemRow[] = systems
    .filter((s) => (s.worst_ratio ?? 0) > 1.0)
    .sort((a, b) => (b.worst_ratio ?? 0) - (a.worst_ratio ?? 0))
    .slice(0, 10)
    .map((s) => ({
      pwsid: s.pwsid,
      system_name: s.pws_name,
      city: s.city_served,
      grade: s.grade,
      worst_compound: s.worst_compound,
      worst_ratio: s.worst_ratio,
      population_served: s.population_served,
    }));

  // All systems sorted by grade severity then worst_ratio
  const all_systems: StateSystemRow[] = [...systems]
    .sort((a, b) => {
      const ra = a.grade ? GRADE_RANK[a.grade] : 5;
      const rb = b.grade ? GRADE_RANK[b.grade] : 5;
      if (ra !== rb) return ra - rb;
      return (b.worst_ratio ?? -1) - (a.worst_ratio ?? -1);
    })
    .map((s) => ({
      pwsid: s.pwsid,
      system_name: s.pws_name,
      city: s.city_served,
      grade: s.grade,
      worst_compound: s.worst_compound,
      worst_ratio: s.worst_ratio,
      population_served: s.population_served,
    }));

  // Most common compound across the state
  const pwsidsForDetections = systems
    .filter((s) => (s.total_pfas_detected ?? 0) > 0)
    .map((s) => s.pwsid);
  const most_common_compound = await findMostCommonCompound(
    pwsidsForDetections
  );

  // Related content
  const cities = await fetchCitiesForState(info.code);
  const news = await fetchNewsForState(info.code);

  // Blog investigations matching this state via city slugs
  let investigations: StateBlogLink[] = [];
  try {
    // Avoid pulling the whole blog lib into a server component context
    // with a lightweight lookup by city_slug.
    const { getAllPosts } = await import("@/lib/blog");
    const citySlugs = new Set(cities.map((c) => c.slug));
    investigations = getAllPosts()
      .filter((p) =>
        p.frontmatter.city_slug && citySlugs.has(p.frontmatter.city_slug)
      )
      .map((p) => ({
        slug: p.frontmatter.slug,
        title: p.frontmatter.title,
        description: p.frontmatter.description,
        date: p.frontmatter.date,
        city_slug: p.frontmatter.city_slug ?? null,
      }));
  } catch {
    investigations = [];
  }

  return {
    info,
    total_systems,
    total_population,
    systems_with_detections,
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
    legislative: loadLegislative(info.code, info.name),
  };
}

/**
 * Lightweight summary used by the /states index. Fetches only enough to
 * show aggregate stats per state without the full system list or detection
 * queries.
 */
export interface StateSummary {
  info: StateInfo;
  total_systems: number;
  total_population: number;
  systems_with_exceedances: number;
  population_with_exceedances: number;
  grade_counts: Record<Grade, number>;
}

export async function getAllStateSummaries(): Promise<StateSummary[]> {
  // Fetch all graded systems once, aggregate per state in memory.
  // This is far cheaper than running 51 separate state queries at build time.
  const summaries: Map<string, StateSummary> = new Map();
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabasePublic
      .from("water_systems")
      .select(
        "pwsid, state_code, population_served, grade, worst_ratio"
      )
      .order("pwsid")
      .range(offset, offset + PAGE - 1);
    if (error) {
      console.error("[stateData] getAllStateSummaries:", error.message);
      break;
    }
    const rows = data ?? [];
    for (const r of rows) {
      const code = (r.state_code as string | null)?.toUpperCase() ?? "";
      const info = getStateByCode(code);
      if (!info) continue;
      let entry = summaries.get(code);
      if (!entry) {
        entry = {
          info,
          total_systems: 0,
          total_population: 0,
          systems_with_exceedances: 0,
          population_with_exceedances: 0,
          grade_counts: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        };
        summaries.set(code, entry);
      }
      entry.total_systems++;
      entry.total_population += Number(r.population_served ?? 0) || 0;
      const wr = Number(r.worst_ratio ?? 0) || 0;
      if (wr > 1.0) {
        entry.systems_with_exceedances++;
        entry.population_with_exceedances +=
          Number(r.population_served ?? 0) || 0;
      }
      const g = (r.grade as string | null) ?? null;
      if (g && (g === "A" || g === "B" || g === "C" || g === "D" || g === "F")) {
        entry.grade_counts[g as Grade]++;
      }
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (offset > 50_000) break;
  }

  // Ensure every state appears, even if we have zero rows.
  const out: StateSummary[] = [];
  for (const info of (await import("@/lib/states")).STATES) {
    const existing = summaries.get(info.code);
    if (existing) {
      out.push(existing);
    } else {
      out.push({
        info,
        total_systems: 0,
        total_population: 0,
        systems_with_exceedances: 0,
        population_with_exceedances: 0,
        grade_counts: { A: 0, B: 0, C: 0, D: 0, F: 0 },
      });
    }
  }
  return out;
}

export { GRADE_ORDER, GRADE_RANK };
