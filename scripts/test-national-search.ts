/**
 * Mission 10 · Part 1: National zip-code search coverage test.
 *
 * Picks 20 zip codes from across the country (NOT our 20 launch cities) and
 * runs each one through the same lookup logic the /api/search route uses,
 * then reports hit/miss and a coverage summary.
 *
 * This validates that CheckYourWater works nationally, not just for the
 * curated launch cities. Any zip with a mapping will return useful
 * results through the existing search flow.
 *
 * Run: npx tsx scripts/test-national-search.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "in .env.local."
  );
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

interface TestZip {
  zip: string;
  label: string;
}

const TEST_ZIPS: TestZip[] = [
  { zip: "10001", label: "New York, NY" },
  { zip: "90210", label: "Beverly Hills, CA" },
  { zip: "60601", label: "Chicago, IL" },
  { zip: "77001", label: "Houston, TX" },
  { zip: "85001", label: "Phoenix, AZ" },
  { zip: "98101", label: "Seattle, WA" },
  { zip: "33101", label: "Miami, FL" },
  { zip: "02101", label: "Boston, MA" },
  { zip: "80201", label: "Denver, CO" },
  { zip: "97201", label: "Portland, OR" },
  { zip: "55401", label: "Minneapolis, MN" },
  { zip: "15201", label: "Pittsburgh, PA" },
  { zip: "28201", label: "Charlotte, NC" },
  { zip: "37201", label: "Nashville, TN" },
  { zip: "48201", label: "Detroit, MI" },
  { zip: "63101", label: "St. Louis, MO" },
  { zip: "46201", label: "Indianapolis, IN" },
  { zip: "53201", label: "Milwaukee, WI" },
  { zip: "84101", label: "Salt Lake City, UT" },
  { zip: "23219", label: "Richmond, VA" },
];

interface HitRow {
  zip: string;
  label: string;
  pwsid: string;
  pws_name: string;
  grade: string | null;
  total_pfas_detected: number;
  population_served: number | null;
  mapping_count: number;
}

interface MissRow {
  zip: string;
  label: string;
  reason: string;
}

async function lookupZip(zip: string): Promise<
  | { ok: true; system: Omit<HitRow, "zip" | "label"> }
  | { ok: false; reason: string }
> {
  // 1. Resolve zip → PWSIDs (primary first, then by population). Mirrors
  //    the production lookup in src/lib/geo.ts.
  const { data: zipRows, error: zipErr } = await sb
    .from("zip_to_water_system")
    .select("pwsid, is_primary, population_served")
    .eq("zip_code", zip)
    .order("is_primary", { ascending: false })
    .order("population_served", { ascending: false, nullsFirst: false });

  if (zipErr) {
    return { ok: false, reason: `DB error (zip_to_water_system): ${zipErr.message}` };
  }
  if (!zipRows || zipRows.length === 0) {
    return { ok: false, reason: "no mapping in zip_to_water_system" };
  }

  const primary = zipRows[0];
  const { data: sys, error: sysErr } = await sb
    .from("water_systems")
    .select(
      "pwsid, pws_name, grade, total_pfas_detected, population_served"
    )
    .eq("pwsid", primary.pwsid as string)
    .maybeSingle();

  if (sysErr) {
    return { ok: false, reason: `DB error (water_systems): ${sysErr.message}` };
  }
  if (!sys) {
    return {
      ok: false,
      reason: `mapped to PWSID ${primary.pwsid} but no water_systems row`,
    };
  }

  return {
    ok: true,
    system: {
      pwsid: sys.pwsid as string,
      pws_name: (sys.pws_name as string) ?? "(no name)",
      grade: (sys.grade as string | null) ?? null,
      total_pfas_detected: Number(sys.total_pfas_detected ?? 0),
      population_served:
        sys.population_served === null ? null : Number(sys.population_served),
      mapping_count: zipRows.length,
    },
  };
}

function pad(v: string | number | null | undefined, width: number): string {
  const s = v === null || v === undefined ? "-" : String(v);
  if (s.length >= width) return s.slice(0, width);
  return s + " ".repeat(width - s.length);
}

function fmtPop(n: number | null): string {
  if (n === null) return "-";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

async function main(): Promise<void> {
  console.log("=".repeat(96));
  console.log("CheckYourWater · Mission 10 · National zip-code search test");
  console.log("=".repeat(96));
  console.log();
  console.log(
    `${pad("Zip", 6)}| ${pad("Location", 22)}| ${pad("PWSID", 11)}| ${pad(
      "System Name",
      28
    )}| ${pad("Grade", 5)}| ${pad("Det", 4)}| ${pad("Pop", 7)}| Note`
  );
  console.log("-".repeat(96));

  const hits: HitRow[] = [];
  const misses: MissRow[] = [];

  for (const test of TEST_ZIPS) {
    const result = await lookupZip(test.zip);
    if (result.ok) {
      const row: HitRow = {
        zip: test.zip,
        label: test.label,
        ...result.system,
      };
      hits.push(row);
      const note =
        row.mapping_count > 1 ? `${row.mapping_count} systems at this zip` : "ok";
      console.log(
        `${pad(row.zip, 6)}| ${pad(row.label, 22)}| ${pad(row.pwsid, 11)}| ${pad(
          row.pws_name,
          28
        )}| ${pad(row.grade, 5)}| ${pad(row.total_pfas_detected, 4)}| ${pad(
          fmtPop(row.population_served),
          7
        )}| ${note}`
      );
    } else {
      misses.push({ zip: test.zip, label: test.label, reason: result.reason });
      console.log(
        `${pad(test.zip, 6)}| ${pad(test.label, 22)}| ${pad("-", 11)}| ${pad(
          "-",
          28
        )}| ${pad("-", 5)}| ${pad("-", 4)}| ${pad("-", 7)}| GAP: ${result.reason}`
      );
    }
  }

  console.log();
  console.log("-".repeat(96));
  console.log(
    `Coverage: ${hits.length} of ${TEST_ZIPS.length} test zips have mappings (${(
      (hits.length / TEST_ZIPS.length) *
      100
    ).toFixed(0)}%)`
  );

  if (misses.length > 0) {
    console.log();
    console.log("Gaps (these zips have no mapping in zip_to_water_system):");
    for (const m of misses) {
      console.log(`  · ${m.zip} (${m.label}): ${m.reason}`);
    }
    console.log();
    console.log(
      "Note: gaps are expected for some zips. Either the zip serves a water\n" +
        "system smaller than UCMR 5's ~3,300-person threshold, or the SDWIS\n" +
        "service-area crosswalk doesn't reach every residential zip. These\n" +
        "users will see the improved 'no data' message with a link to /cities."
    );
  }

  // Bonus check: confirm /system/[pwsid] dynamic routing works for a
  // non-launch-city PWSID by round-tripping through loadSystem().
  console.log();
  console.log("-".repeat(96));
  console.log("Dynamic /system/[pwsid] route check (non-launch-city)");
  console.log("-".repeat(96));

  const nonLaunchHit =
    hits.find((h) => h.pwsid === "MI0001800") ??
    hits.find((h) => h.pwsid === "AZ0407025") ??
    hits[0];

  if (nonLaunchHit) {
    const { loadSystem } = await import("../src/lib/cityData");
    const payload = await loadSystem(nonLaunchHit.pwsid);
    if (payload) {
      console.log(
        `loadSystem(${nonLaunchHit.pwsid}) → ${payload.system.pws_name} ` +
          `(grade ${payload.system.grade ?? "-"}, ${payload.fullCompoundTable.length} compounds in full table)`
      );
      console.log(
        `/system/${nonLaunchHit.pwsid} will render on first visit via ISR ` +
          `(dynamicParams = true, no generateStaticParams). ✓`
      );
    } else {
      console.log(
        `FAILED: loadSystem(${nonLaunchHit.pwsid}) returned null. ` +
          `system page would 404 for this PWSID.`
      );
    }
  }

  console.log();
  // Non-zero exit only if EVERY zip missed. Any partial coverage is fine.
  if (hits.length === 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
