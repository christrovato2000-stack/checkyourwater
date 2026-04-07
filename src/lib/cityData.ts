/**
 * Server-side data loaders for /city/[slug] and /system/[pwsid] pages.
 *
 * Returns plain objects (not Supabase rows) so the page components don't
 * have to know about column types or null shapes.
 */
import { supabasePublic } from "@/lib/supabase";
import { PFAS_COMPOUNDS, type PfasCompound } from "@/lib/constants";
import type { Grade } from "@/types/database";

export interface CityRecord {
  slug: string;
  city_name: string;
  state_code: string;
  state_name: string;
  population: number | null;
  systems_count: number | null;
  primary_pwsid: string | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_detections: number | null;
  total_exceedances: number | null;
  contamination_source: string | null;
  settlement_status: string | null;
  news_hook: string | null;
}

export interface CompoundRow {
  abbrev: string;
  full_name: string;
  avg_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
  detected: boolean;
}

export interface SystemWithCompounds {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string;
  population_served: number | null;
  source_type: string | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number;
  compounds: CompoundRow[];
}

export interface CityPagePayload {
  city: CityRecord;
  systems: SystemWithCompounds[];
  summary: { title: string; body: string } | null;
  stateExceedanceCount: number | null;
  totalDetected: number;
  totalExceedances: number;
  totalPopulation: number;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Sort: exceedances (ratio >= 1) desc, then detections by ratio desc, then by name. */
export function sortCompounds(rows: CompoundRow[]): CompoundRow[] {
  return [...rows].sort((a, b) => {
    const aOver = (a.mcl_ratio ?? 0) >= 1 ? 1 : 0;
    const bOver = (b.mcl_ratio ?? 0) >= 1 ? 1 : 0;
    if (aOver !== bOver) return bOver - aOver;
    const aDet = a.detected ? 1 : 0;
    const bDet = b.detected ? 1 : 0;
    if (aDet !== bDet) return bDet - aDet;
    const aR = a.mcl_ratio ?? -1;
    const bR = b.mcl_ratio ?? -1;
    if (aR !== bR) return bR - aR;
    return a.abbrev.localeCompare(b.abbrev);
  });
}

async function getChemicalNames(
  abbrevs: string[]
): Promise<Map<string, string>> {
  if (abbrevs.length === 0) return new Map();
  const { data } = await supabasePublic
    .from("chemicals")
    .select("compound_abbrev, compound_name")
    .in("compound_abbrev", abbrevs);
  return new Map(
    (data ?? []).map((c) => [
      c.compound_abbrev as string,
      c.compound_name as string,
    ])
  );
}

async function loadDetectionsFor(
  pwsid: string
): Promise<CompoundRow[]> {
  const { data } = await supabasePublic
    .from("detections")
    .select(
      "compound_abbrev, compound_name, avg_concentration, mcl, mcl_ratio, has_mcl"
    )
    .eq("pwsid", pwsid)
    .order("mcl_ratio", { ascending: false, nullsFirst: false })
    .order("avg_concentration", { ascending: false, nullsFirst: false });

  const detections = data ?? [];
  const abbrevs = detections.map((d) => d.compound_abbrev as string);
  const fullNames = await getChemicalNames(abbrevs);

  return detections.map((d) => ({
    abbrev: d.compound_abbrev as string,
    full_name:
      fullNames.get(d.compound_abbrev as string) ??
      (d.compound_name as string) ??
      (d.compound_abbrev as string),
    avg_concentration: num(d.avg_concentration),
    mcl: num(d.mcl),
    mcl_ratio: num(d.mcl_ratio),
    has_mcl: !!d.has_mcl,
    detected: true,
  }));
}

export async function loadCity(slug: string): Promise<CityPagePayload | null> {
  const { data: cityRow } = await supabasePublic
    .from("cities")
    .select(
      "slug, city_name, state_code, state_name, population, systems_count, primary_pwsid, grade, worst_compound, worst_ratio, total_detections, total_exceedances, contamination_source, settlement_status, news_hook"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!cityRow) return null;

  const city: CityRecord = {
    slug: cityRow.slug as string,
    city_name: cityRow.city_name as string,
    state_code: cityRow.state_code as string,
    state_name: (cityRow.state_name as string) ?? cityRow.state_code,
    population: num(cityRow.population),
    systems_count: num(cityRow.systems_count),
    primary_pwsid: (cityRow.primary_pwsid as string | null) ?? null,
    grade: ((cityRow.grade as string | null) ?? null) as Grade | null,
    worst_compound: (cityRow.worst_compound as string | null) ?? null,
    worst_ratio: num(cityRow.worst_ratio),
    total_detections: num(cityRow.total_detections),
    total_exceedances: num(cityRow.total_exceedances),
    contamination_source: (cityRow.contamination_source as string | null) ?? null,
    settlement_status: (cityRow.settlement_status as string | null) ?? null,
    news_hook: (cityRow.news_hook as string | null) ?? null,
  };

  // Find systems serving this city: by city_served name OR primary_pwsid match.
  const orParts: string[] = [];
  orParts.push(`city_served.ilike.${city.city_name}`);
  if (city.primary_pwsid) orParts.push(`pwsid.eq.${city.primary_pwsid}`);
  const { data: sysRows } = await supabasePublic
    .from("water_systems")
    .select(
      "pwsid, pws_name, city_served, state_code, population_served, source_type, grade, worst_compound, worst_ratio, total_pfas_detected"
    )
    .eq("state_code", city.state_code)
    .or(orParts.join(","));

  const systemsRaw = sysRows ?? [];

  // Make sure the primary system is included even if name didn't match
  if (
    city.primary_pwsid &&
    !systemsRaw.find((s) => s.pwsid === city.primary_pwsid)
  ) {
    const { data: extra } = await supabasePublic
      .from("water_systems")
      .select(
        "pwsid, pws_name, city_served, state_code, population_served, source_type, grade, worst_compound, worst_ratio, total_pfas_detected"
      )
      .eq("pwsid", city.primary_pwsid)
      .maybeSingle();
    if (extra) systemsRaw.push(extra);
  }

  const systems: SystemWithCompounds[] = await Promise.all(
    systemsRaw.map(async (s) => {
      const compounds = await loadDetectionsFor(s.pwsid as string);
      return {
        pwsid: s.pwsid as string,
        pws_name: s.pws_name as string,
        city_served: (s.city_served as string | null) ?? null,
        state_code: s.state_code as string,
        population_served: num(s.population_served),
        source_type: (s.source_type as string | null) ?? null,
        grade: ((s.grade as string | null) ?? null) as Grade | null,
        worst_compound: (s.worst_compound as string | null) ?? null,
        worst_ratio: num(s.worst_ratio),
        total_pfas_detected: Number(s.total_pfas_detected ?? 0),
        compounds: sortCompounds(compounds),
      };
    })
  );

  // Sort: primary system first, then by population desc.
  systems.sort((a, b) => {
    if (city.primary_pwsid) {
      if (a.pwsid === city.primary_pwsid) return -1;
      if (b.pwsid === city.primary_pwsid) return 1;
    }
    return (b.population_served ?? 0) - (a.population_served ?? 0);
  });

  // City summary content (may not exist yet; Mission 4 generates it)
  const { data: contentRow } = await supabasePublic
    .from("content")
    .select("title, body")
    .eq("content_type", "city_summary")
    .eq("reference_key", slug)
    .maybeSingle();

  const summary = contentRow
    ? {
        title: (contentRow.title as string) ?? "",
        body: (contentRow.body as string) ?? "",
      }
    : null;

  // Count cities in this state with exceedances (for context section)
  let stateExceedanceCount: number | null = null;
  try {
    const { count } = await supabasePublic
      .from("cities")
      .select("slug", { count: "exact", head: true })
      .eq("state_code", city.state_code)
      .gt("total_exceedances", 0);
    stateExceedanceCount = count ?? null;
  } catch {
    stateExceedanceCount = null;
  }

  const totalDetected = systems.reduce(
    (acc, s) => acc + (s.compounds.filter((c) => c.detected).length),
    0
  );
  const totalExceedances = systems.reduce(
    (acc, s) => acc + s.compounds.filter((c) => (c.mcl_ratio ?? 0) >= 1).length,
    0
  );
  const totalPopulation = systems.reduce(
    (acc, s) => acc + (s.population_served ?? 0),
    0
  );

  return {
    city,
    systems,
    summary,
    stateExceedanceCount,
    totalDetected,
    totalExceedances,
    totalPopulation: totalPopulation || (city.population ?? 0),
  };
}

export interface SystemPagePayload {
  system: SystemWithCompounds;
  /** All 29 UCMR 5 compounds, with detections merged in. */
  fullCompoundTable: CompoundRow[];
  citySlug: string | null;
  summary: { title: string; body: string } | null;
}

export async function loadSystem(
  pwsid: string
): Promise<SystemPagePayload | null> {
  const { data: sysRow } = await supabasePublic
    .from("water_systems")
    .select(
      "pwsid, pws_name, city_served, state_code, population_served, source_type, grade, worst_compound, worst_ratio, total_pfas_detected"
    )
    .eq("pwsid", pwsid)
    .maybeSingle();

  if (!sysRow) return null;

  const compounds = await loadDetectionsFor(sysRow.pwsid as string);
  const detectedByAbbrev = new Map(compounds.map((c) => [c.abbrev, c]));

  // Build full table: every UCMR 5 compound, marking non-detects.
  const fullCompoundTable: CompoundRow[] = PFAS_COMPOUNDS.map(
    (def: PfasCompound) => {
      const hit = detectedByAbbrev.get(def.abbrev);
      if (hit) return hit;
      return {
        abbrev: def.abbrev,
        full_name: def.name,
        avg_concentration: null,
        mcl: def.mclPpt,
        mcl_ratio: null,
        has_mcl: def.mclPpt !== null,
        detected: false,
      };
    }
  );
  const sortedFull = sortCompounds(fullCompoundTable);

  const system: SystemWithCompounds = {
    pwsid: sysRow.pwsid as string,
    pws_name: sysRow.pws_name as string,
    city_served: (sysRow.city_served as string | null) ?? null,
    state_code: sysRow.state_code as string,
    population_served: num(sysRow.population_served),
    source_type: (sysRow.source_type as string | null) ?? null,
    grade: ((sysRow.grade as string | null) ?? null) as Grade | null,
    worst_compound: (sysRow.worst_compound as string | null) ?? null,
    worst_ratio: num(sysRow.worst_ratio),
    total_pfas_detected: Number(sysRow.total_pfas_detected ?? 0),
    compounds,
  };

  // Find a city slug pointing at this system, if any.
  const { data: cityRow } = await supabasePublic
    .from("cities")
    .select("slug")
    .eq("primary_pwsid", pwsid)
    .maybeSingle();

  // System-specific AI summary if it exists.
  const { data: contentRow } = await supabasePublic
    .from("content")
    .select("title, body")
    .eq("content_type", "system_summary")
    .eq("reference_key", pwsid)
    .maybeSingle();

  return {
    system,
    fullCompoundTable: sortedFull,
    citySlug: (cityRow?.slug as string | null) ?? null,
    summary: contentRow
      ? {
          title: (contentRow.title as string) ?? "",
          body: (contentRow.body as string) ?? "",
        }
      : null,
  };
}
