/**
 * Parse UCMR5_All.txt into a clean JSON array of PFAS sample records.
 *
 * Filters:
 *   - Drops lithium (not a PFAS).
 *   - Keeps every PFAS sample, including non-detects.
 *
 * Normalizes:
 *   - Concentration to ppt (ng/L). UCMR 5 reports in µg/L, so multiply by 1000.
 *   - Non-detects (sign "<" or empty value) -> result_ppt = null, is_detect = false.
 *   - MRL is also converted to ppt.
 *
 * Output: data/parsed-ucmr5.json
 *
 * Run: npm run data:parse-ucmr5
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { matchPfasCompound } from "../src/lib/constants";

const DATA_DIR = path.join(__dirname, "..", "data");
const INPUT = path.join(DATA_DIR, "UCMR5_All.txt");
const OUTPUT = path.join(DATA_DIR, "parsed-ucmr5.jsonl");

interface ParsedSample {
  pwsid: string;
  pws_name: string;
  size: string;
  state_code_num: string; // EPA's 2-digit state FIPS-ish code
  region: string;
  facility_id: string;
  facility_name: string;
  facility_water_type: string;
  sample_point_id: string;
  sample_point_type: string;
  collection_date: string;
  sample_id: string;
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  result_ppt: number | null;
  mrl_ppt: number | null;
  is_detect: boolean;
  has_mcl: boolean;
  method_id: string;
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`UCMR5_All.txt not found at ${INPUT}`);
  }

  const out = fs.createWriteStream(OUTPUT, { encoding: "utf-8" });

  let header: string[] | null = null;
  let total = 0;
  let kept = 0;
  let droppedLithium = 0;
  let droppedNoMatch = 0;
  let detects = 0;
  let firstRecord = true;
  const dropExamples = new Set<string>();

  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT, { encoding: "latin1" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line) continue;
    if (!header) {
      header = line.split("\t");
      continue;
    }
    total++;
    const cols = line.split("\t");
    if (cols.length < 24) continue;

    const contaminantRaw = cols[13];
    if (contaminantRaw.toLowerCase().includes("lithium")) {
      droppedLithium++;
      continue;
    }

    const compound = matchPfasCompound(contaminantRaw);
    if (!compound) {
      droppedNoMatch++;
      if (dropExamples.size < 10) dropExamples.add(contaminantRaw);
      continue;
    }

    const sign = cols[17];
    const valueStr = cols[18];
    const mrlStr = cols[14];
    const units = cols[15];

    // UCMR 5 reports everything in µg/L. Defensive check:
    const factor = units && units.includes("/L") ? 1000 : 1000;

    const isDetect = sign === "=" && valueStr !== "" && valueStr !== null;
    const result_ppt = isDetect && valueStr ? parseFloat(valueStr) * factor : null;
    const mrl_ppt = mrlStr ? parseFloat(mrlStr) * factor : null;

    if (isDetect) detects++;

    const rec: ParsedSample = {
      pwsid: cols[0],
      pws_name: cols[1],
      size: cols[2],
      facility_id: cols[3],
      facility_name: cols[4],
      facility_water_type: cols[5],
      sample_point_id: cols[6],
      sample_point_type: cols[8],
      collection_date: cols[11],
      sample_id: cols[12],
      compound_abbrev: compound.abbrev,
      compound_name: compound.name,
      cas_number: compound.cas,
      result_ppt:
        result_ppt !== null && !Number.isNaN(result_ppt) ? result_ppt : null,
      mrl_ppt: mrl_ppt !== null && !Number.isNaN(mrl_ppt) ? mrl_ppt : null,
      is_detect: isDetect,
      has_mcl: compound.mclPpt !== null,
      method_id: cols[16],
      region: cols[21],
      state_code_num: cols[22],
    };

    out.write(JSON.stringify(rec) + "\n");
    firstRecord = false;
    kept++;

    if (kept % 100000 === 0) {
      console.log(
        `  processed ${total.toLocaleString()} rows, kept ${kept.toLocaleString()}, detects so far ${detects.toLocaleString()}`
      );
    }
  }

  out.end();
  await new Promise<void>((r) => out.on("finish", () => r()));

  console.log(`\n=== UCMR 5 parse complete ===`);
  console.log(`  Total data rows:       ${total.toLocaleString()}`);
  console.log(`  Kept (PFAS):           ${kept.toLocaleString()}`);
  console.log(`  Dropped lithium:       ${droppedLithium.toLocaleString()}`);
  console.log(`  Dropped no-match:      ${droppedNoMatch.toLocaleString()}`);
  if (dropExamples.size) {
    console.log(`  Drop examples: ${[...dropExamples].join(", ")}`);
  }
  console.log(`  Detects:               ${detects.toLocaleString()}`);
  console.log(`  Output:                ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
