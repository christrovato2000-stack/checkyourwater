/**
 * Assign letter grades to every UCMR 5 water system based on its
 * aggregated detections.
 *
 * Logic (from src/lib/constants.ts):
 *   - If any regulated PFAS has an MCL ratio:
 *       > 5.0   -> F
 *       > 1.0   -> D
 *       > 0.5   -> C
 *       > 0     -> B
 *   - If only non-regulated PFAS detected, grade by detection count:
 *       0 -> A, 1-2 -> B, 3-5 -> C, 6+ -> D
 *   - If no detections at all -> A
 *
 * Output: data/graded-systems.json
 *
 * Run: npm run data:grade
 */
import * as fs from "fs";
import * as path from "path";
import {
  Grade,
  gradeFromMclRatio,
  gradeFromDetectionCount,
} from "../src/lib/constants";

const DATA_DIR = path.join(__dirname, "..", "data");
const INPUT = path.join(DATA_DIR, "aggregated-detections.json");
const OUTPUT = path.join(DATA_DIR, "graded-systems.json");

interface Aggregate {
  pwsid: string;
  pws_name: string;
  compound_abbrev: string;
  compound_name: string;
  detection_count: number;
  avg_concentration: number | null;
  max_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
}

interface GradedSystem {
  pwsid: string;
  pws_name: string;
  grade: Grade;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number; // distinct compounds detected
}

function main() {
  const aggs: Aggregate[] = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

  const bySystem = new Map<string, Aggregate[]>();
  for (const a of aggs) {
    if (!bySystem.has(a.pwsid)) bySystem.set(a.pwsid, []);
    bySystem.get(a.pwsid)!.push(a);
  }

  const out: GradedSystem[] = [];
  let counts: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };

  for (const [pwsid, rows] of bySystem) {
    const detected = rows.filter((r) => r.detection_count > 0);
    const totalDetected = detected.length;

    if (totalDetected === 0) {
      out.push({
        pwsid,
        pws_name: rows[0].pws_name,
        grade: "A",
        worst_compound: null,
        worst_ratio: null,
        total_pfas_detected: 0,
      });
      counts.A++;
      continue;
    }

    const regulatedDetected = detected.filter(
      (r) => r.has_mcl && r.mcl_ratio !== null
    );

    if (regulatedDetected.length > 0) {
      let worst = regulatedDetected[0];
      for (const r of regulatedDetected) {
        if ((r.mcl_ratio ?? 0) > (worst.mcl_ratio ?? 0)) worst = r;
      }
      const grade = gradeFromMclRatio(worst.mcl_ratio) ?? "B";
      out.push({
        pwsid,
        pws_name: rows[0].pws_name,
        grade,
        worst_compound: worst.compound_abbrev,
        worst_ratio: worst.mcl_ratio,
        total_pfas_detected: totalDetected,
      });
      counts[grade]++;
    } else {
      // Only non-regulated PFAS detected
      const grade = gradeFromDetectionCount(totalDetected);
      // Pick the highest-concentration compound as the "worst"
      let worst = detected[0];
      for (const r of detected) {
        if ((r.max_concentration ?? 0) > (worst.max_concentration ?? 0))
          worst = r;
      }
      out.push({
        pwsid,
        pws_name: rows[0].pws_name,
        grade,
        worst_compound: worst.compound_abbrev,
        worst_ratio: null,
        total_pfas_detected: totalDetected,
      });
      counts[grade]++;
    }
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out));

  console.log(`=== Grading complete ===`);
  console.log(`Systems graded: ${out.length.toLocaleString()}`);
  console.log(`  A: ${counts.A.toLocaleString()}`);
  console.log(`  B: ${counts.B.toLocaleString()}`);
  console.log(`  C: ${counts.C.toLocaleString()}`);
  console.log(`  D: ${counts.D.toLocaleString()}`);
  console.log(`  F: ${counts.F.toLocaleString()}`);
  console.log(`Output: ${OUTPUT}`);
}

main();
