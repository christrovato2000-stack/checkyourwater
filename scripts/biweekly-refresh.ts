/**
 * Biweekly UCMR 5 refresh + site health check.
 *
 * Run by .github/workflows/biweekly-refresh.yml every 2 weeks.
 *
 * Steps:
 *   1. Download the latest UCMR 5 occurrence-data zip from EPA and extract
 *      UCMR5_All.txt into ./data.
 *   2. Hash UCMR5_All.txt and compare against ./data/.ucmr5-hash
 *      (committed in the repo). If unchanged, skip the pipeline.
 *   3. If changed: snapshot the current grades out of Supabase, run the
 *      existing parse → aggregate → grade → seed pipeline, then diff the
 *      new grades against the snapshot to figure out which systems flipped
 *      letter grade, which were added, and which were removed. Update the
 *      committed hash file.
 *   4. Hit every /city/<slug> URL on checkyourwater.org and confirm each
 *      one returns HTTP 200.
 *   5. Send an email summary via Resend (subject + plaintext body) to
 *      $NOTIFY_EMAIL describing what changed and the health-check result,
 *      or "nothing changed, all healthy" if both were clean.
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *   NOTIFY_EMAIL          (recipient for the summary)
 *
 * Optional env:
 *   UCMR5_ZIP_URL         (override the EPA zip URL)
 *   RESEND_FROM_EMAIL     (defaults to onboarding@resend.dev)
 *   SITE_URL              (defaults to https://checkyourwater.org)
 */
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { execSync } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ZIP_PATH = path.join(DATA_DIR, "ucmr5-latest.zip");
const TXT_PATH = path.join(DATA_DIR, "UCMR5_All.txt");
// NOTE: lives at repo root (not in data/) because data/ is gitignored and
// this file needs to be committed so the next run can read it.
const HASH_PATH = path.join(ROOT, ".ucmr5-hash");
const SNAPSHOT_PATH = path.join(DATA_DIR, "grades-snapshot.json");
const GRADED_PATH = path.join(DATA_DIR, "graded-systems.json");

const SITE_URL = process.env.SITE_URL ?? "https://checkyourwater.org";
const DEFAULT_ZIP_URL =
  "https://www.epa.gov/system/files/other-files/2025-01/ucmr-5-occurrence-data.zip";
const LANDING_URL =
  "https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_KEY = process.env.RESEND_API_KEY;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ??
  "CheckYourWater <onboarding@resend.dev>";

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type Grade = "A" | "B" | "C" | "D" | "F";
interface GradeRow {
  pwsid: string;
  grade: Grade;
  pws_name?: string | null;
}
interface DiffResult {
  added: GradeRow[];
  removed: GradeRow[];
  flipped: { pwsid: string; pws_name: string | null; from: Grade; to: Grade }[];
  totalNew: number;
  totalOld: number;
}
interface HealthResult {
  total: number;
  ok: number;
  failures: { slug: string; status: number | string; url: string }[];
}

// ---------------------------------------------------------------------------
// 1. Download + extract UCMR 5
// ---------------------------------------------------------------------------

async function resolveZipUrl(): Promise<string> {
  if (process.env.UCMR5_ZIP_URL) return process.env.UCMR5_ZIP_URL;
  // Try the EPA landing page for the most current ucmr-5-occurrence-data.zip
  // link before falling back to the last-known URL.
  try {
    const res = await fetch(LANDING_URL, {
      headers: { "User-Agent": "checkyourwater-refresh-bot" },
    });
    if (res.ok) {
      const html = await res.text();
      const match = html.match(
        /https:\/\/www\.epa\.gov\/system\/files\/[^"']*ucmr[-_]5[^"']*occurrence[^"']*\.zip/i
      );
      if (match) {
        console.log(`Resolved zip URL from EPA landing page: ${match[0]}`);
        return match[0];
      }
    }
  } catch (e) {
    console.warn("Could not scrape EPA landing page:", (e as Error).message);
  }
  console.log(`Falling back to default zip URL: ${DEFAULT_ZIP_URL}`);
  return DEFAULT_ZIP_URL;
}

async function downloadAndExtract(): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const url = await resolveZipUrl();
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`EPA download failed: ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(ZIP_PATH, buf);
  console.log(`Wrote ${ZIP_PATH} (${buf.length.toLocaleString()} bytes)`);

  // Extract using system unzip (available on ubuntu-latest runner).
  // -o overwrite, -d destination.
  execSync(`unzip -o "${ZIP_PATH}" -d "${DATA_DIR}"`, { stdio: "inherit" });

  if (!fs.existsSync(TXT_PATH)) {
    // Some EPA bundles ship with different casing or in a subdirectory.
    const found = findFile(DATA_DIR, /UCMR5_All\.txt$/i);
    if (!found) {
      throw new Error("UCMR5_All.txt not found in extracted zip");
    }
    fs.copyFileSync(found, TXT_PATH);
  }
  console.log(`Have ${TXT_PATH}`);
}

function findFile(dir: string, re: RegExp): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const hit = findFile(full, re);
      if (hit) return hit;
    } else if (re.test(entry.name)) {
      return full;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 2. Hash + change detection
// ---------------------------------------------------------------------------

function hashFile(file: string): string {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

function readPriorHash(): string | null {
  if (!fs.existsSync(HASH_PATH)) return null;
  return fs.readFileSync(HASH_PATH, "utf-8").trim();
}

function writeHash(hash: string): void {
  fs.writeFileSync(HASH_PATH, hash + "\n");
}

// ---------------------------------------------------------------------------
// 3. Snapshot + diff
// ---------------------------------------------------------------------------

async function snapshotCurrentGrades(): Promise<GradeRow[]> {
  // water_systems is the canonical place where grades live in production.
  const out: GradeRow[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("water_systems")
      .select("pwsid, pws_name, grade")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) {
      out.push({
        pwsid: r.pwsid as string,
        pws_name: (r.pws_name as string) ?? null,
        grade: (r.grade as Grade) ?? "A",
      });
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(out));
  console.log(`Snapshotted ${out.length.toLocaleString()} systems from Supabase`);
  return out;
}

function diffGrades(prior: GradeRow[], next: GradeRow[]): DiffResult {
  const priorMap = new Map(prior.map((r) => [r.pwsid, r]));
  const nextMap = new Map(next.map((r) => [r.pwsid, r]));

  const added: GradeRow[] = [];
  const removed: GradeRow[] = [];
  const flipped: DiffResult["flipped"] = [];

  for (const r of next) {
    const old = priorMap.get(r.pwsid);
    if (!old) {
      added.push(r);
    } else if (old.grade !== r.grade) {
      flipped.push({
        pwsid: r.pwsid,
        pws_name: r.pws_name ?? old.pws_name ?? null,
        from: old.grade,
        to: r.grade,
      });
    }
  }
  for (const r of prior) {
    if (!nextMap.has(r.pwsid)) removed.push(r);
  }

  return {
    added,
    removed,
    flipped,
    totalNew: next.length,
    totalOld: prior.length,
  };
}

// ---------------------------------------------------------------------------
// 4. Health check every city page
// ---------------------------------------------------------------------------

async function loadCitySlugs(): Promise<string[]> {
  const { data, error } = await sb.from("cities").select("slug");
  if (error) throw error;
  return (data ?? []).map((r) => r.slug as string).filter(Boolean);
}

async function healthCheckCities(): Promise<HealthResult> {
  const slugs = await loadCitySlugs();
  console.log(`Health-checking ${slugs.length} city pages on ${SITE_URL}`);
  const result: HealthResult = { total: slugs.length, ok: 0, failures: [] };

  // Limit concurrency to be polite to the site.
  const CONCURRENCY = 6;
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= slugs.length) return;
      const slug = slugs[i];
      const url = `${SITE_URL}/city/${slug}`;
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "User-Agent": "checkyourwater-healthcheck-bot" },
          redirect: "follow",
        });
        if (res.status === 200) {
          result.ok++;
        } else {
          result.failures.push({ slug, status: res.status, url });
        }
      } catch (e) {
        result.failures.push({
          slug,
          status: (e as Error).message,
          url,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`  ${result.ok}/${result.total} returned 200`);
  return result;
}

// ---------------------------------------------------------------------------
// 5. Email summary
// ---------------------------------------------------------------------------

function buildSummary(args: {
  changed: boolean;
  diff: DiffResult | null;
  health: HealthResult;
  zipUrl: string;
  newHash: string;
  oldHash: string | null;
}): { subject: string; body: string } {
  const { changed, diff, health, zipUrl, newHash, oldHash } = args;
  const allHealthy = health.failures.length === 0;

  let subject: string;
  if (!changed && allHealthy) {
    subject = "[CheckYourWater] Biweekly: nothing changed, all healthy";
  } else if (!changed && !allHealthy) {
    subject = `[CheckYourWater] Biweekly: data unchanged, ${health.failures.length} city page(s) failing`;
  } else if (changed && allHealthy) {
    const flips = diff?.flipped.length ?? 0;
    const adds = diff?.added.length ?? 0;
    subject = `[CheckYourWater] Biweekly: UCMR 5 updated (${flips} grade changes, ${adds} new systems)`;
  } else {
    subject = `[CheckYourWater] Biweekly: UCMR 5 updated AND ${health.failures.length} city page(s) failing`;
  }

  const lines: string[] = [];
  lines.push("CheckYourWater — Biweekly Data + Health Check");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Run time: ${new Date().toISOString()}`);
  lines.push(`EPA source: ${zipUrl}`);
  lines.push(`Site: ${SITE_URL}`);
  lines.push("");

  // --- UCMR 5 data section ---
  lines.push("# UCMR 5 data");
  if (!changed) {
    lines.push(`No change detected. UCMR5_All.txt sha256 = ${newHash}`);
    lines.push("Database was NOT touched.");
  } else {
    lines.push(`CHANGED. New sha256 = ${newHash}`);
    lines.push(`Previous   sha256 = ${oldHash ?? "(none on record)"}`);
    if (diff) {
      lines.push("");
      lines.push(`Total systems before: ${diff.totalOld.toLocaleString()}`);
      lines.push(`Total systems after:  ${diff.totalNew.toLocaleString()}`);
      lines.push(`Grade changes:        ${diff.flipped.length.toLocaleString()}`);
      lines.push(`Systems added:        ${diff.added.length.toLocaleString()}`);
      lines.push(`Systems removed:      ${diff.removed.length.toLocaleString()}`);

      if (diff.flipped.length) {
        lines.push("");
        lines.push("## Grade changes (first 50)");
        const worst = (g: Grade) => "ABCDF".indexOf(g);
        const sorted = [...diff.flipped].sort(
          (a, b) => worst(b.to) - worst(a.to)
        );
        for (const f of sorted.slice(0, 50)) {
          const dir = worst(f.to) > worst(f.from) ? "WORSE" : "better";
          lines.push(
            `  ${f.from} → ${f.to}  [${dir}]  ${f.pwsid}  ${f.pws_name ?? ""}`
          );
        }
        if (diff.flipped.length > 50) {
          lines.push(`  ... and ${diff.flipped.length - 50} more`);
        }
      }
      if (diff.added.length) {
        lines.push("");
        lines.push("## New systems (first 25)");
        for (const a of diff.added.slice(0, 25)) {
          lines.push(`  ${a.grade}  ${a.pwsid}  ${a.pws_name ?? ""}`);
        }
        if (diff.added.length > 25) {
          lines.push(`  ... and ${diff.added.length - 25} more`);
        }
      }
      if (diff.removed.length) {
        lines.push("");
        lines.push("## Removed systems (first 25)");
        for (const r of diff.removed.slice(0, 25)) {
          lines.push(`  ${r.grade}  ${r.pwsid}  ${r.pws_name ?? ""}`);
        }
        if (diff.removed.length > 25) {
          lines.push(`  ... and ${diff.removed.length - 25} more`);
        }
      }
    }
  }

  // --- Health section ---
  lines.push("");
  lines.push("# City page health");
  lines.push(`Checked: ${health.total}`);
  lines.push(`OK (200): ${health.ok}`);
  lines.push(`Failed:   ${health.failures.length}`);
  if (health.failures.length) {
    lines.push("");
    lines.push("## Failures");
    for (const f of health.failures) {
      lines.push(`  [${f.status}] ${f.url}`);
    }
  }

  lines.push("");
  lines.push("---");
  lines.push("Automated by .github/workflows/biweekly-refresh.yml");

  return { subject, body: lines.join("\n") };
}

async function sendSummary(subject: string, body: string): Promise<void> {
  console.log(`\n=== EMAIL ===\nSubject: ${subject}\n\n${body}\n=== /EMAIL ===\n`);
  if (!RESEND_KEY || !NOTIFY_EMAIL) {
    console.warn(
      "RESEND_API_KEY or NOTIFY_EMAIL not set — printed email above instead of sending."
    );
    return;
  }
  const resend = new Resend(RESEND_KEY);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [NOTIFY_EMAIL],
    subject,
    text: body,
  });
  if (error) {
    console.error("Resend error:", error);
    throw new Error(`Resend send failed: ${error.message ?? "unknown"}`);
  }
  console.log(`Email sent to ${NOTIFY_EMAIL}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function runStep(label: string, cmd: string): void {
  console.log(`\n--- ${label} ---`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT });
}

async function main() {
  console.log("Biweekly refresh starting", new Date().toISOString());

  const zipUrl = await (async () => {
    if (process.env.UCMR5_ZIP_URL) return process.env.UCMR5_ZIP_URL;
    return DEFAULT_ZIP_URL;
  })();

  await downloadAndExtract();

  const newHash = hashFile(TXT_PATH);
  const oldHash = readPriorHash();
  const changed = newHash !== oldHash;
  console.log(`UCMR5_All.txt sha256: ${newHash}`);
  console.log(`Previous hash:        ${oldHash ?? "(none)"}`);
  console.log(`Changed:              ${changed}`);

  let diff: DiffResult | null = null;

  if (changed) {
    const prior = await snapshotCurrentGrades();

    runStep("parse-ucmr5", "npx tsx scripts/parse-ucmr5.ts");
    runStep("aggregate-detections", "npx tsx scripts/aggregate-detections.ts");
    runStep("assign-grades", "npx tsx scripts/assign-grades.ts");

    const next: GradeRow[] = JSON.parse(
      fs.readFileSync(GRADED_PATH, "utf-8")
    );
    diff = diffGrades(prior, next);
    console.log(
      `Diff: +${diff.added.length} added, -${diff.removed.length} removed, ${diff.flipped.length} grade changes`
    );

    runStep("seed-database", "npx tsx scripts/seed-database.ts");

    // Optional: regenerate map data so the static GeoJSON stays in sync.
    try {
      runStep("generate-geojson", "npx tsx scripts/generate-geojson.ts");
    } catch (e) {
      console.warn("generate-geojson failed (non-fatal):", (e as Error).message);
    }

    writeHash(newHash);
  } else {
    console.log("Skipping parse/seed pipeline — UCMR 5 file is identical.");
  }

  const health = await healthCheckCities();

  const { subject, body } = buildSummary({
    changed,
    diff,
    health,
    zipUrl,
    newHash,
    oldHash,
  });
  await sendSummary(subject, body);

  // Exit non-zero if any city page failed, so the workflow shows a red X
  // in the GitHub Actions UI even though the email already went out.
  if (health.failures.length > 0) {
    console.error(`Health check found ${health.failures.length} failures.`);
    process.exitCode = 1;
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error("biweekly-refresh failed:", e);
  // Try to send a failure email so we still get notified.
  if (RESEND_KEY && NOTIFY_EMAIL) {
    const resend = new Resend(RESEND_KEY);
    resend.emails
      .send({
        from: FROM_EMAIL,
        to: [NOTIFY_EMAIL],
        subject: "[CheckYourWater] Biweekly refresh FAILED",
        text: `Biweekly refresh threw an error:\n\n${(e as Error).stack ?? e}`,
      })
      .catch(() => {});
  }
  process.exit(1);
});
