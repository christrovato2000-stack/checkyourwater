/**
 * Aggregate parsed UCMR 5 samples into one row per (PWSID, compound) pair.
 *
 * For each pair we compute:
 *   - sample_count, detection_count
 *   - avg/min/max concentration (over DETECTS only — non-detects are
 *     treated as zero / not contributing to the mean per EPA convention
 *     for occurrence summaries; we provide max & detection_count so the
 *     consumer can interpret the average)
 *   - mrl (most common MRL across samples)
 *   - mcl, mcl_ratio, has_mcl  (from constants.ts)
 *
 * Output: data/aggregated-detections.json
 *
 * Run: npm run data:aggregate
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { EPA_MCL_PPT, PFAS_BY_ABBREV } from "../src/lib/constants";

const DATA_DIR = path.join(__dirname, "..", "data");
const INPUT = path.join(DATA_DIR, "parsed-ucmr5.jsonl");
const OUTPUT = path.join(DATA_DIR, "aggregated-detections.json");

interface ParsedSample {
  pwsid: string;
  pws_name: string;
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  result_ppt: number | null;
  mrl_ppt: number | null;
  is_detect: boolean;
  has_mcl: boolean;
}

interface Aggregate {
  pwsid: string;
  pws_name: string;
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  sample_count: number;
  detection_count: number;
  avg_concentration: number | null;
  max_concentration: number | null;
  min_concentration: number | null;
  mrl: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
}

async function main() {
  type Key = string;
  const groups = new Map<
    Key,
    {
      pwsid: string;
      pws_name: string;
      compound_abbrev: string;
      compound_name: string;
      cas_number: string | null;
      sample_count: number;
      detection_count: number;
      sumDetect: number;
      maxDetect: number;
      minDetect: number;
      mrlCounts: Map<number, number>;
    }
  >();

  let sampleCount = 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (!line) continue;
    const s: ParsedSample = JSON.parse(line);
    sampleCount++;
    const key = `${s.pwsid}|${s.compound_abbrev}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        pwsid: s.pwsid,
        pws_name: s.pws_name,
        compound_abbrev: s.compound_abbrev,
        compound_name: s.compound_name,
        cas_number: s.cas_number,
        sample_count: 0,
        detection_count: 0,
        sumDetect: 0,
        maxDetect: -Infinity,
        minDetect: Infinity,
        mrlCounts: new Map(),
      };
      groups.set(key, g);
    }
    g.sample_count++;
    if (s.is_detect && s.result_ppt !== null) {
      g.detection_count++;
      g.sumDetect += s.result_ppt;
      if (s.result_ppt > g.maxDetect) g.maxDetect = s.result_ppt;
      if (s.result_ppt < g.minDetect) g.minDetect = s.result_ppt;
    }
    if (s.mrl_ppt !== null) {
      g.mrlCounts.set(s.mrl_ppt, (g.mrlCounts.get(s.mrl_ppt) ?? 0) + 1);
    }
  }

  console.log(`Streamed ${sampleCount.toLocaleString()} samples into ${groups.size.toLocaleString()} groups`);

  const out: Aggregate[] = [];
  for (const g of groups.values()) {
    const compound = PFAS_BY_ABBREV[g.compound_abbrev.toLowerCase()];
    const mcl = compound?.mclPpt ?? EPA_MCL_PPT[g.compound_abbrev] ?? null;
    const has_mcl = mcl !== null;

    const avg =
      g.detection_count > 0
        ? +(g.sumDetect / g.detection_count).toFixed(4)
        : null;
    const max = g.detection_count > 0 ? +g.maxDetect.toFixed(4) : null;
    const min = g.detection_count > 0 ? +g.minDetect.toFixed(4) : null;

    let mode_mrl: number | null = null;
    let best = -1;
    for (const [v, c] of g.mrlCounts.entries()) {
      if (c > best) {
        best = c;
        mode_mrl = v;
      }
    }

    const mcl_ratio =
      mcl !== null && avg !== null ? +(avg / mcl).toFixed(4) : null;

    out.push({
      pwsid: g.pwsid,
      pws_name: g.pws_name,
      compound_abbrev: g.compound_abbrev,
      compound_name: g.compound_name,
      cas_number: g.cas_number,
      sample_count: g.sample_count,
      detection_count: g.detection_count,
      avg_concentration: avg,
      max_concentration: max,
      min_concentration: min,
      mrl: mode_mrl,
      mcl,
      mcl_ratio,
      has_mcl,
    });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out));
  console.log(`Wrote ${out.length.toLocaleString()} aggregated rows to ${OUTPUT}`);

  const detectedRows = out.filter((r) => r.detection_count > 0);
  console.log(`Of which ${detectedRows.length.toLocaleString()} have ≥1 detection`);

  const exceedances = out.filter((r) => (r.mcl_ratio ?? 0) > 1);
  console.log(`Rows with mcl_ratio > 1 (exceedances): ${exceedances.length.toLocaleString()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
