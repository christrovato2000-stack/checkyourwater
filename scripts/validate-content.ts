/**
 * Quality check on generated content. Reads from the `content` table and
 * cross-references against `chemicals` and `cities` to flag drift between
 * the AI-generated copy and the database of record.
 *
 * Run: npm run content:validate
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

interface Issue {
  ref: string;
  severity: "critical" | "warning";
  message: string;
}

const CHEM_REQUIRED_HEADINGS = [
  "## What is",
  "## Where does it come from",
  "## Health concerns",
  "## EPA standard",
  "## What you can do",
];

const CITY_REQUIRED_HEADINGS = [
  "## Summary",
  "## What the data shows",
  "## What residents should know",
];

const FORBIDDEN_MEDICAL_PHRASES = [
  /\bcauses cancer\b/i,
  /\bcauses (?!.*?(linked|associat))/i, // bare "causes X" without "linked"/"associated"
  /\bwill (give|cause) you\b/i,
];

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function findNumbers(s: string): number[] {
  // Pull plain decimals or integers — not phone-number-like sequences.
  const matches = s.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  return matches.map((m) => Number(m));
}

async function validateChemicalExplainers(issues: Issue[]) {
  const { data: chemicals } = await sb
    .from("chemicals")
    .select("compound_abbrev, compound_name, mcl_ppt");
  const chemMap = new Map(
    (chemicals ?? []).map((c) => [c.compound_abbrev as string, c])
  );

  const { data: rows } = await sb
    .from("content")
    .select("reference_key, body")
    .eq("content_type", "chemical_explainer");

  const list = rows ?? [];
  console.log(`Validating ${list.length} chemical explainers...`);

  for (const r of list) {
    const ref = r.reference_key as string;
    const body = (r.body as string) ?? "";
    const chem = chemMap.get(ref);

    // Headings
    for (const h of CHEM_REQUIRED_HEADINGS) {
      if (!body.includes(h)) {
        issues.push({
          ref,
          severity: "critical",
          message: `missing heading "${h}"`,
        });
      }
    }

    // Word count
    const wc = wordCount(body);
    if (wc < 200 || wc > 400) {
      issues.push({
        ref,
        severity: "warning",
        message: `word count ${wc} outside 200-400`,
      });
    }

    // First-person voice
    if (/(?:^|\s)(I|we|our|us|my)(?:[\s,.;:!?']|$)/.test(body)) {
      issues.push({
        ref,
        severity: "warning",
        message: "uses first-person ('I'/'we'/'our')",
      });
    }

    // Definitive medical claims
    for (const re of FORBIDDEN_MEDICAL_PHRASES) {
      if (re.test(body)) {
        issues.push({
          ref,
          severity: "critical",
          message: `forbidden medical phrase matching ${re}`,
        });
        break;
      }
    }

    if (!chem) {
      issues.push({
        ref,
        severity: "critical",
        message: "compound not found in chemicals table",
      });
      continue;
    }

    // Abbreviation present
    if (!body.includes(ref)) {
      issues.push({
        ref,
        severity: "warning",
        message: `abbreviation ${ref} not present in body`,
      });
    }

    // MCL accuracy
    const mcl = chem.mcl_ppt as number | null;
    if (mcl !== null) {
      // Body should mention the MCL value somewhere
      const numbers = findNumbers(body);
      const found = numbers.some((n) => Math.abs(n - Number(mcl)) < 0.51);
      if (!found) {
        issues.push({
          ref,
          severity: "warning",
          message: `MCL ${mcl} ppt not mentioned in body`,
        });
      }
    } else {
      // Should explain there is no federal limit
      const noLimitPatterns = [
        /no (federal|epa)/i,
        /not.*regulated/i,
        /(has not|hasn't|not yet) (established|set)/i,
        /no enforceable/i,
        /unregulated/i,
        /no .* (mcl|maximum contaminant level)/i,
      ];
      if (!noLimitPatterns.some((p) => p.test(body))) {
        issues.push({
          ref,
          severity: "warning",
          message: "no MCL exists but body doesn't explain absence",
        });
      }
    }
  }

  return list.length;
}

async function validateCitySummaries(issues: Issue[]) {
  const { data: cities } = await sb
    .from("cities")
    .select("slug, city_name, grade")
    .eq("launch_wave", 1);
  const cityMap = new Map((cities ?? []).map((c) => [c.slug as string, c]));

  const { data: rows } = await sb
    .from("content")
    .select("reference_key, body")
    .eq("content_type", "city_summary");

  const list = rows ?? [];
  console.log(`Validating ${list.length} city summaries...`);

  for (const r of list) {
    const ref = r.reference_key as string;
    const body = (r.body as string) ?? "";
    const city = cityMap.get(ref);

    for (const h of CITY_REQUIRED_HEADINGS) {
      if (!body.includes(h)) {
        issues.push({
          ref,
          severity: "critical",
          message: `missing heading "${h}"`,
        });
      }
    }

    const wc = wordCount(body);
    if (wc < 150 || wc > 350) {
      issues.push({
        ref,
        severity: "warning",
        message: `word count ${wc} outside 150-350`,
      });
    }

    if (!city) {
      issues.push({
        ref,
        severity: "critical",
        message: "city not found in cities table",
      });
      continue;
    }

    const grade = city.grade as string | null;
    if (grade) {
      // Body should mention the grade letter or "Grade {X}"
      const re = new RegExp(`grade\\s+${grade}\\b|"${grade}"|\\b${grade}\\b`, "i");
      // Avoid false positives: require explicit grade context.
      if (!new RegExp(`grade(?:d)?\\s+(?:of\\s+)?${grade}\\b|${grade}\\s+grade`, "i").test(body)) {
        issues.push({
          ref,
          severity: "warning",
          message: `grade ${grade} not clearly mentioned`,
        });
      }
    }
  }

  return list.length;
}

async function main() {
  const issues: Issue[] = [];
  const chemCount = await validateChemicalExplainers(issues);
  const cityCount = await validateCitySummaries(issues);
  const total = chemCount + cityCount;

  const critical = issues.filter((i) => i.severity === "critical");
  const warnings = issues.filter((i) => i.severity === "warning");
  const passing = total - new Set(issues.map((i) => i.ref)).size;

  console.log("\n=== Validation report ===");
  console.log(`Total pieces:    ${total}`);
  console.log(`Passing all:     ${passing}`);
  console.log(`Critical issues: ${critical.length}`);
  console.log(`Warnings:        ${warnings.length}`);

  if (critical.length > 0) {
    console.log("\nCRITICAL:");
    for (const i of critical) console.log(`  [${i.ref}] ${i.message}`);
  }
  if (warnings.length > 0) {
    console.log("\nWARNINGS:");
    for (const i of warnings) console.log(`  [${i.ref}] ${i.message}`);
  }

  console.log(
    `\nOverall status: ${critical.length === 0 ? "PASS" : "NEEDS REVIEW"}`
  );
  process.exit(critical.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
