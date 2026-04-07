/**
 * Parse SDWA_PUB_WATER_SYSTEMS.csv and SDWA_GEOGRAPHIC_AREAS.csv
 * to build:
 *   - data/sdwis-water-systems.json   (PWSID -> metadata)
 *   - data/sdwis-zip-crosswalk.json   (Tier 1 zip -> PWSID mapping)
 *
 * The SDWIS pub water systems file does NOT include lat/long. Coordinates
 * come from a separate file (SDWA_GEOGRAPHIC_AREAS only has city/county/zip).
 * For now we leave coordinates null and rely on city centroid lookups
 * downstream.
 *
 * Run: npm run data:parse-sdwis
 */
import * as fs from "fs";
import * as path from "path";
import { parse } from "csv-parse";

const DATA_DIR = path.join(__dirname, "..", "data");
const PWS_CSV = path.join(DATA_DIR, "SDWA_PUB_WATER_SYSTEMS.csv");
const GEO_CSV = path.join(DATA_DIR, "SDWA_GEOGRAPHIC_AREAS.csv");
const SYSTEMS_OUT = path.join(DATA_DIR, "sdwis-water-systems.json");
const ZIP_OUT = path.join(DATA_DIR, "sdwis-zip-crosswalk.json");

interface SdwisSystem {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string | null;
  county: string | null;
  population_served: number | null;
  source_type: string | null;
  primacy_agency: string | null;
  pws_type: string | null;
  pws_active: boolean;
}

interface ZipMapping {
  zip_code: string;
  pwsid: string;
}

async function readCsv<T>(file: string, mapper: (r: any) => T | null): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const out: T[] = [];
    fs.createReadStream(file)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          relax_column_count: true,
          trim: true,
        })
      )
      .on("data", (row) => {
        const v = mapper(row);
        if (v) out.push(v);
      })
      .on("end", () => resolve(out))
      .on("error", reject);
  });
}

async function main() {
  if (!fs.existsSync(PWS_CSV)) throw new Error(`Missing ${PWS_CSV}`);
  if (!fs.existsSync(GEO_CSV)) throw new Error(`Missing ${GEO_CSV}`);

  console.log(`Parsing ${PWS_CSV}...`);
  const systems = await readCsv<SdwisSystem>(PWS_CSV, (row) => {
    // SDWA_PUB_WATER_SYSTEMS.csv columns (canonical SDWIS_FED export):
    //   PWSID, PWS_NAME, PRIMACY_AGENCY_CODE, EPA_REGION, SEASON_BEGIN_DATE, ...
    //   POPULATION_SERVED_COUNT, SERVICE_CONNECTIONS_COUNT, ...
    //   PRIMARY_SOURCE_CODE, IS_GRANT_ELIGIBLE_IND, IS_WHOLESALER_IND, ...
    //   PWS_TYPE_CODE, PWS_ACTIVITY_CODE, OWNER_TYPE_CODE,
    //   CITY_NAME, STATE_CODE, ZIP_CODE, COUNTY ...
    const pwsid = row.PWSID || row.pwsid;
    if (!pwsid) return null;
    return {
      pwsid: pwsid.trim(),
      pws_name: (row.PWS_NAME || "").trim(),
      city_served: (row.CITY_NAME || row.CITY || "").trim() || null,
      state_code:
        (row.STATE_CODE || row.PRIMACY_AGENCY_CODE || "").trim() || null,
      county: (row.COUNTY_SERVED || row.COUNTIES_SERVED || "").trim() || null,
      population_served:
        row.POPULATION_SERVED_COUNT && row.POPULATION_SERVED_COUNT !== ""
          ? parseInt(row.POPULATION_SERVED_COUNT, 10)
          : null,
      source_type: (row.PRIMARY_SOURCE_CODE || "").trim() || null,
      primacy_agency: (row.PRIMACY_AGENCY_CODE || "").trim() || null,
      pws_type: (row.PWS_TYPE_CODE || "").trim() || null,
      pws_active: (row.PWS_ACTIVITY_CODE || "").trim() === "A",
    };
  });
  console.log(`  ${systems.length.toLocaleString()} water system rows`);

  console.log(`Parsing ${GEO_CSV}...`);
  const zips = await readCsv<ZipMapping>(GEO_CSV, (row) => {
    // SDWA_GEOGRAPHIC_AREAS.csv columns:
    //   PWSID, AREA_TYPE_CODE, ZIP_CODE_SERVED, CITY_SERVED, COUNTY_SERVED, STATE_SERVED, ...
    const areaType = (row.AREA_TYPE_CODE || "").trim();
    if (areaType !== "ZC") return null;
    const z = (row.ZIP_CODE_SERVED || row.ZIP_CODE || "").trim();
    if (!z || !/^\d{5}$/.test(z)) return null;
    const pwsid = (row.PWSID || "").trim();
    if (!pwsid) return null;
    return { zip_code: z, pwsid };
  });
  console.log(`  ${zips.length.toLocaleString()} zip-code mapping rows`);

  fs.writeFileSync(SYSTEMS_OUT, JSON.stringify(systems));
  fs.writeFileSync(ZIP_OUT, JSON.stringify(zips));
  console.log(`Wrote ${SYSTEMS_OUT}`);
  console.log(`Wrote ${ZIP_OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
