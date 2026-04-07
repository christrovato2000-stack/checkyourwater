/**
 * Zip-code → water system lookup. Used by /api/search and any server code
 * that needs to resolve a zip into one or more PWSIDs + their detection data.
 */
import { supabasePublic } from "@/lib/supabase";
import type { Grade } from "@/types/database";

export interface SearchDetection {
  compound_abbrev: string;
  compound_name: string;
  avg_concentration: number | null;
  max_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
}

export interface SearchSystem {
  pwsid: string;
  name: string;
  city: string | null;
  state: string;
  population_served: number | null;
  is_primary: boolean;
  confidence: string;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number;
  city_slug: string | null;
  top_detections: SearchDetection[];
}

export interface SearchResultPayload {
  zip: string;
  systems: SearchSystem[];
  total_systems: number;
}

export type LookupError =
  | { kind: "invalid"; message: string }
  | { kind: "not_found"; message: string }
  | { kind: "db"; message: string };

export type LookupOutcome =
  | { ok: true; data: SearchResultPayload }
  | { ok: false; error: LookupError };

const ZIP_RE = /^\d{5}$/;

export async function lookupZip(zipRaw: string): Promise<LookupOutcome> {
  const zip = (zipRaw ?? "").trim();
  if (!ZIP_RE.test(zip)) {
    return {
      ok: false,
      error: { kind: "invalid", message: "Please enter a 5-digit zip code." },
    };
  }

  // 1. Resolve zip → list of PWSIDs (primary first, then by population)
  const { data: zipRows, error: zipErr } = await supabasePublic
    .from("zip_to_water_system")
    .select("pwsid, is_primary, confidence, population_served")
    .eq("zip_code", zip)
    .order("is_primary", { ascending: false })
    .order("population_served", { ascending: false, nullsFirst: false });

  if (zipErr) {
    return { ok: false, error: { kind: "db", message: zipErr.message } };
  }
  if (!zipRows || zipRows.length === 0) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message:
          "We don't have water quality data for this zip code. This may be a very small or rural system not yet included in EPA testing. Try a nearby zip code.",
      },
    };
  }

  const pwsids = zipRows.map((r) => r.pwsid as string);

  // 2. Pull water system rows
  const { data: systems, error: sysErr } = await supabasePublic
    .from("water_systems")
    .select(
      "pwsid, pws_name, city_served, state_code, population_served, grade, worst_compound, worst_ratio, total_pfas_detected"
    )
    .in("pwsid", pwsids);

  if (sysErr) {
    return { ok: false, error: { kind: "db", message: sysErr.message } };
  }
  if (!systems || systems.length === 0) {
    return {
      ok: false,
      error: {
        kind: "not_found",
        message:
          "We found a zip mapping but no water system records. Try a nearby zip code.",
      },
    };
  }

  const sysByPwsid = new Map(systems.map((s) => [s.pwsid as string, s]));

  // 3. Pull top detections for the PRIMARY system only
  const primaryZipRow = zipRows[0];
  const primaryPwsid = primaryZipRow.pwsid as string;

  const { data: detections, error: detErr } = await supabasePublic
    .from("detections")
    .select(
      "compound_abbrev, compound_name, avg_concentration, max_concentration, mcl, mcl_ratio, has_mcl"
    )
    .eq("pwsid", primaryPwsid)
    .order("mcl_ratio", { ascending: false, nullsFirst: false })
    .order("avg_concentration", { ascending: false, nullsFirst: false })
    .limit(5);

  if (detErr) {
    return { ok: false, error: { kind: "db", message: detErr.message } };
  }

  // 4. Pull chemical full names for any compound abbrevs we care about
  const abbrevs = (detections ?? [])
    .map((d) => d.compound_abbrev as string)
    .filter(Boolean);
  let nameByAbbrev = new Map<string, string>();
  if (abbrevs.length > 0) {
    const { data: chems } = await supabasePublic
      .from("chemicals")
      .select("compound_abbrev, compound_name")
      .in("compound_abbrev", abbrevs);
    if (chems) {
      nameByAbbrev = new Map(
        chems.map((c) => [c.compound_abbrev as string, c.compound_name as string])
      );
    }
  }

  // 5. Pull city slugs (if any) for these PWSIDs
  const { data: cityRows } = await supabasePublic
    .from("cities")
    .select("slug, primary_pwsid")
    .in("primary_pwsid", pwsids);
  const slugByPwsid = new Map(
    (cityRows ?? []).map((c) => [c.primary_pwsid as string, c.slug as string])
  );

  // 6. Assemble systems in zipRow order (primary first)
  const out: SearchSystem[] = zipRows
    .map((zr) => {
      const s = sysByPwsid.get(zr.pwsid as string);
      if (!s) return null;
      const isPrimary = !!zr.is_primary;
      const top: SearchDetection[] =
        isPrimary && detections
          ? detections.map((d) => ({
              compound_abbrev: d.compound_abbrev as string,
              compound_name:
                nameByAbbrev.get(d.compound_abbrev as string) ??
                (d.compound_name as string) ??
                (d.compound_abbrev as string),
              avg_concentration:
                d.avg_concentration === null ? null : Number(d.avg_concentration),
              max_concentration:
                d.max_concentration === null ? null : Number(d.max_concentration),
              mcl: d.mcl === null ? null : Number(d.mcl),
              mcl_ratio:
                d.mcl_ratio === null ? null : Number(d.mcl_ratio),
              has_mcl: !!d.has_mcl,
            }))
          : [];

      return {
        pwsid: s.pwsid as string,
        name: (s.pws_name as string) ?? "",
        city: (s.city_served as string | null) ?? null,
        state: (s.state_code as string) ?? "",
        population_served:
          s.population_served === null
            ? null
            : Number(s.population_served),
        is_primary: isPrimary,
        confidence: (zr.confidence as string) ?? "medium",
        grade: ((s.grade as string | null) ?? null) as Grade | null,
        worst_compound: (s.worst_compound as string | null) ?? null,
        worst_ratio:
          s.worst_ratio === null ? null : Number(s.worst_ratio),
        total_pfas_detected: Number(s.total_pfas_detected ?? 0),
        city_slug: slugByPwsid.get(s.pwsid as string) ?? null,
        top_detections: top,
      } satisfies SearchSystem;
    })
    .filter((x): x is SearchSystem => x !== null);

  return {
    ok: true,
    data: { zip, systems: out, total_systems: out.length },
  };
}
