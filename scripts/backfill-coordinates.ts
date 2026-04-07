/**
 * Backfill coordinates, population, city, county, source_type for every
 * water system in the database.
 *
 * Sources:
 *   - sdwis-water-systems.json   (city, county, population, source_type)
 *   - 2024_Gaz_zcta_national.txt (Census ZCTA centroids)
 *   - zip_to_water_system table  (zips serving each PWSID)
 *
 * For each system, we pick the primary zip (largest population, falling back
 * to is_primary, then first) and use its ZCTA centroid as the system's
 * lat/lng. This gives ~zip-level accuracy — good enough for a national map.
 *
 * Run: npm run data:backfill-coords
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const DATA_DIR = path.join(__dirname, "..", "data");
const SDWIS_PATH = path.join(DATA_DIR, "sdwis-water-systems.json");
const ZCTA_PATH = path.join(DATA_DIR, "2024_Gaz_zcta_national.txt");

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

interface SdwisSystem {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string | null;
  county: string | null;
  population_served: number | null;
  source_type: string | null;
}

function loadZctaCentroids(): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>();
  const text = fs.readFileSync(ZCTA_PATH, "utf-8");
  const lines = text.split(/\r?\n/);
  // header: GEOID ALAND AWATER ALAND_SQMI AWATER_SQMI INTPTLAT INTPTLONG
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(/\t/).map((p) => p.trim());
    if (parts.length < 7) continue;
    const zip = parts[0];
    const lat = parseFloat(parts[5]);
    const lng = parseFloat(parts[6]);
    if (!/^\d{5}$/.test(zip) || !isFinite(lat) || !isFinite(lng)) continue;
    out.set(zip, [lat, lng]);
  }
  return out;
}

function loadSdwisMap(): Map<string, SdwisSystem> {
  const arr: SdwisSystem[] = JSON.parse(fs.readFileSync(SDWIS_PATH, "utf-8"));
  const m = new Map<string, SdwisSystem>();
  for (const s of arr) m.set(s.pwsid, s);
  return m;
}

async function fetchAllZipMappings(): Promise<
  Map<string, { zip: string; is_primary: boolean }[]>
> {
  // Pull every row from zip_to_water_system in batches.
  const byPws = new Map<string, { zip: string; is_primary: boolean }[]>();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("zip_to_water_system")
      .select("zip_code,pwsid,is_primary")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      const list = byPws.get(r.pwsid) ?? [];
      list.push({ zip: r.zip_code, is_primary: !!r.is_primary });
      byPws.set(r.pwsid, list);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return byPws;
}

async function fetchAllSystems(): Promise<any[]> {
  const out: any[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("water_systems")
      .select(
        "pwsid,pws_name,state_code,latitude,population_served,city_served,county"
      )
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function main() {
  console.log("Loading ZCTA centroids...");
  const zctas = loadZctaCentroids();
  console.log(`  ${zctas.size.toLocaleString()} ZCTA centroids`);

  console.log("Loading SDWIS metadata...");
  const sdwis = loadSdwisMap();
  console.log(`  ${sdwis.size.toLocaleString()} SDWIS systems`);

  console.log("Fetching zip mappings from DB...");
  const zipsByPws = await fetchAllZipMappings();
  console.log(`  ${zipsByPws.size.toLocaleString()} systems have zip mappings`);

  console.log("Fetching all water systems from DB...");
  const systems = await fetchAllSystems();
  console.log(`  ${systems.length.toLocaleString()} water systems`);

  // Build per-system update payloads
  const updates: any[] = [];
  let coordCount = 0;
  let popCount = 0;
  let cityCount = 0;
  let countyCount = 0;

  for (const sys of systems) {
    const sd = sdwis.get(sys.pwsid);

    // Determine coordinates from zip centroid
    const zips = zipsByPws.get(sys.pwsid) ?? [];
    let coord: [number, number] | null = null;
    // Prefer is_primary
    const primary = zips.find((z) => z.is_primary);
    if (primary && zctas.has(primary.zip)) coord = zctas.get(primary.zip)!;
    if (!coord) {
      for (const z of zips) {
        if (zctas.has(z.zip)) {
          coord = zctas.get(z.zip)!;
          break;
        }
      }
    }

    // Always include NOT-NULL columns so upsert works as INSERT...ON CONFLICT
    const update: any = {
      pwsid: sys.pwsid,
      pws_name: sys.pws_name,
      state_code: sys.state_code,
    };
    let touched = false;

    if (coord && sys.latitude == null) {
      update.latitude = +coord[0].toFixed(5);
      update.longitude = +coord[1].toFixed(5);
      coordCount++;
      touched = true;
    } else if (coord) {
      // Already had coords; still count
      coordCount++;
    }

    if (sd) {
      if (sd.city_served && !sys.city_served) {
        update.city_served = sd.city_served;
        cityCount++;
        touched = true;
      }
      if (sd.county && !sys.county) {
        update.county = sd.county;
        countyCount++;
        touched = true;
      }
      if (sd.population_served != null && !sys.population_served) {
        update.population_served = sd.population_served;
        popCount++;
        touched = true;
      }
      if (sd.source_type) {
        update.source_type = sd.source_type;
        touched = true;
      }
    }

    if (touched) updates.push(update);
  }

  console.log(`\nPlanned updates: ${updates.length.toLocaleString()}`);
  console.log(`  new coords:    ${coordCount.toLocaleString()}`);
  console.log(`  new city:      ${cityCount.toLocaleString()}`);
  console.log(`  new county:    ${countyCount.toLocaleString()}`);
  console.log(`  new pop:       ${popCount.toLocaleString()}`);

  // Apply updates in batches via upsert (each row carries pwsid + NOT NULL
  // cols, so on-conflict will UPDATE the additional columns we set).
  const BATCH = 500;
  for (let i = 0; i < updates.length; i += BATCH) {
    const chunk = updates.slice(i, i + BATCH);
    const { error } = await sb
      .from("water_systems")
      .upsert(chunk, { onConflict: "pwsid" });
    if (error) {
      console.error(`  upsert chunk ${i} failed:`, error.message);
      throw error;
    }
    if ((i / BATCH) % 4 === 0) {
      console.log(
        `  applied ${(i + chunk.length).toLocaleString()}/${updates.length.toLocaleString()}`
      );
    }
  }

  // Validation summary
  const after = await fetchAllSystems();
  const total = after.length;
  const hasCoords = after.filter((r) => r.latitude != null).length;
  const hasPop = after.filter((r) => r.population_served != null).length;
  const hasCity = after.filter((r) => r.city_served != null).length;
  const hasCounty = after.filter((r) => r.county != null).length;

  console.log("\n=== COVERAGE ===");
  console.log(`  total:    ${total.toLocaleString()}`);
  console.log(
    `  coords:   ${hasCoords.toLocaleString()} (${((hasCoords / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  pop:      ${hasPop.toLocaleString()} (${((hasPop / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  city:     ${hasCity.toLocaleString()} (${((hasCity / total) * 100).toFixed(1)}%)`
  );
  console.log(
    `  county:   ${hasCounty.toLocaleString()} (${((hasCounty / total) * 100).toFixed(1)}%)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
