/**
 * Generate AI content for checkyourwater.org.
 *
 * Two batches:
 *   1. Chemical explainers: one per row in the `chemicals` table
 *   2. City summaries:     one per row in `cities` where launch_wave = 1
 *
 * Calls Claude Sonnet via the Anthropic Messages API and upserts the
 * generated markdown into the `content` table. Skips anything that's
 * already been approved so re-runs don't clobber reviewed copy.
 *
 * Run: npm run content:generate
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("Supabase credentials missing from .env.local");
}
if (!ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY missing from .env.local");
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Model: Claude Sonnet 4.6. The full dated id; if it 404s we fall back.
const PRIMARY_MODEL = "claude-sonnet-4-6-20250514";
const FALLBACK_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-5"];
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.3;
const REQUEST_DELAY_MS = 200;

interface ChemicalRow {
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  chain_length: string | null;
  mcl_ppt: number | null;
  health_effects: string | null;
  common_sources: string | null;
}

interface CityRow {
  slug: string;
  city_name: string;
  state_code: string;
  state_name: string;
  population: number | null;
  grade: string | null;
  primary_pwsid: string | null;
  contamination_source: string | null;
  settlement_status: string | null;
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

let totalInputTokens = 0;
let totalOutputTokens = 0;
let modelInUse = PRIMARY_MODEL;

async function callClaude(prompt: string): Promise<string> {
  const tryModels = [modelInUse, ...FALLBACK_MODELS.filter((m) => m !== modelInUse)];
  let lastErr: string | null = null;

  for (const model of tryModels) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      lastErr = `${res.status} ${res.statusText}: ${body.slice(0, 200)}`;
      // Only fall through to next model on 404 / model_not_found.
      if (res.status === 404 || /model/i.test(body)) {
        console.warn(`  model ${model} failed (${res.status}); trying next...`);
        continue;
      }
      throw new Error(`Anthropic API error: ${lastErr}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    if (model !== modelInUse) {
      console.log(`  → switched to ${model}`);
      modelInUse = model;
    }
    if (data.usage) {
      totalInputTokens += data.usage.input_tokens;
      totalOutputTokens += data.usage.output_tokens;
    }
    const text = data.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n")
      .trim();
    if (!text) throw new Error("Anthropic returned no text content");
    return text;
  }

  throw new Error(`All models failed: ${lastErr}`);
}

function buildChemicalPrompt(c: ChemicalRow): string {
  const mclLine = c.mcl_ppt
    ? `${c.mcl_ppt} ppt`
    : "No federal limit established";
  const health = c.health_effects ?? "Limited published data";
  const sources = c.common_sources ?? "Industrial sources, consumer products";
  const category = c.chain_length ?? "PFAS";

  return `You are a science writer for a public health tool used by concerned parents and homeowners. Write a plain-language explainer about the PFAS compound below. Your audience has no science background. Write at an 8th-grade reading level.

COMPOUND: ${c.compound_name} (${c.compound_abbrev})
CAS NUMBER: ${c.cas_number ?? "Not assigned"}
CATEGORY: ${category} PFAS
EPA MAXIMUM CONTAMINANT LEVEL: ${mclLine}
HEALTH EFFECTS FROM PUBCHEM: ${health}
COMMON SOURCES: ${sources}

Write EXACTLY these 5 sections with these exact headings:

## What is ${c.compound_abbrev}?
One paragraph (2-3 sentences). What is this chemical? Use its full name once, then the abbreviation. Mention it's a type of PFAS / "forever chemical."

## Where does it come from?
One paragraph (2-3 sentences). What products or industries use or release this chemical? Be specific. Name actual product types (non-stick pans, food packaging, firefighting foam, etc.)

## Health concerns
One paragraph (3-4 sentences). What health effects has research linked to this compound? Distinguish between strong evidence (epidemiological studies, IARC classifications) and preliminary findings (animal studies, limited human data). NEVER say "causes". Say "has been linked to" or "associated with in studies." If evidence is limited, say so honestly.

## EPA standard
One paragraph (2-3 sentences). What is the EPA's MCL for this compound and when was it set? If there is no MCL, explain that no federal limit has been established and what that means. Explain what the MCL means in practical terms.

## What you can do
One paragraph (2-3 sentences). If this compound is found in your water, what specific action should you take? Name the filter type(s) that remove it (reverse osmosis, granular activated carbon, ion exchange; be specific about which work for THIS compound). State that boiling does NOT remove PFAS.

RULES:
- 8th-grade reading level maximum
- No jargon without immediate explanation
- Never provide medical advice; say "consult a healthcare provider" for health-specific questions
- Cite "EPA" or "research studies" as sources, never specific papers
- Total length: 250-350 words
- Do not add any sections beyond the 5 listed above
- Do not add a disclaimer; we handle that separately`;
}

function buildCityPrompt(
  city: CityRow,
  systems: Array<{
    pws_name: string;
    grade: string | null;
    detections: Array<{
      compound_abbrev: string;
      avg_concentration: number | null;
      mcl: number | null;
      mcl_ratio: number | null;
    }>;
  }>
): string {
  const systemsBlock = systems
    .map((s) => {
      const dets =
        s.detections.length === 0
          ? "  (no PFAS detected)"
          : s.detections
              .map((d) => {
                const conc =
                  d.avg_concentration !== null
                    ? `${d.avg_concentration} ppt`
                    : "concentration not reported";
                const ratio =
                  d.mcl_ratio !== null
                    ? ` (${d.mcl_ratio.toFixed(2)}× the EPA limit of ${d.mcl} ppt)`
                    : d.mcl
                    ? ` (EPA limit ${d.mcl} ppt)`
                    : " (no federal limit set)";
                return `  - ${d.compound_abbrev}: ${conc}${ratio}`;
              })
              .join("\n");
      return `${s.pws_name}: Grade ${s.grade ?? "-"}\n${dets}`;
    })
    .join("\n\n");

  return `You are a local news writer summarizing PFAS water contamination data for residents of a specific city. Write a clear, factual summary that a local newspaper could publish. Your audience is residents who want to understand what's in their water.

CITY: ${city.city_name}, ${city.state_name}
POPULATION: ${city.population ?? "unknown"}
GRADE: ${city.grade ?? "-"}

WATER SYSTEMS AND RESULTS:
${systemsBlock}

CONTAMINATION SOURCE: ${city.contamination_source ?? "Not specified"}
SETTLEMENT STATUS: ${city.settlement_status ?? "No settlement information available"}

Write EXACTLY these 3 sections:

## Summary
One paragraph (3-4 sentences). Lead with the most important finding: what grade did the city get and what does that mean for residents? Name the specific compound(s) that exceed limits (if any) and by how much. Put the numbers in context ("X times the federal limit"). End with whether the contamination source is known.

## What the data shows
One paragraph (3-4 sentences). Go deeper into the specific compounds detected. How many were found? How do the levels compare to federal limits? If there are multiple water systems, explain which ones are affected and which are clean. Be precise with numbers.

## What residents should know
One paragraph (2-3 sentences). What should residents of this specific city do based on this data? If the grade is D or F, recommend specific filter types. If a settlement is providing funds, mention it. If the contamination source is known, mention it. Direct them to their water utility for the most current information.

RULES:
- Write as if you are a journalist, not an advocate
- Every claim must be supported by the data provided above
- Use "parts per trillion" and include the number, not just "exceeds limits"
- Never provide medical advice
- Tone: local news anchor. Clear, direct, no panic, no sugarcoating
- Total length: 200-300 words
- Do not add any sections beyond the 3 listed above`;
}

async function isApproved(
  contentType: string,
  referenceKey: string
): Promise<boolean> {
  const { data } = await sb
    .from("content")
    .select("review_status")
    .eq("content_type", contentType)
    .eq("reference_key", referenceKey)
    .maybeSingle();
  return data?.review_status === "approved";
}

async function storeContent(row: {
  content_type: string;
  reference_key: string;
  title: string;
  body: string;
}): Promise<void> {
  const { error } = await sb.from("content").upsert(
    {
      ...row,
      model_used: modelInUse,
      generation_date: new Date().toISOString(),
      review_status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "content_type,reference_key" }
  );
  if (error) throw new Error(`upsert failed: ${error.message}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateChemicalExplainers(): Promise<void> {
  console.log("\n=== Chemical explainers ===");
  const { data: chemicals, error } = await sb
    .from("chemicals")
    .select(
      "compound_abbrev, compound_name, cas_number, chain_length, mcl_ppt, health_effects, common_sources"
    )
    .order("compound_abbrev");
  if (error) throw error;
  if (!chemicals) return;

  console.log(`Found ${chemicals.length} chemicals`);

  let i = 0;
  for (const c of chemicals as ChemicalRow[]) {
    i++;
    const refKey = c.compound_abbrev;
    if (await isApproved("chemical_explainer", refKey)) {
      console.log(`  [${i}/${chemicals.length}] ${refKey}: skipped (approved)`);
      continue;
    }

    try {
      const body = await callClaude(buildChemicalPrompt(c));
      await storeContent({
        content_type: "chemical_explainer",
        reference_key: refKey,
        title: `${refKey}: What you need to know`,
        body,
      });
      console.log(
        `  [${i}/${chemicals.length}] ${refKey}: generated (${body.length} chars)`
      );
    } catch (e) {
      console.error(`  [${i}/${chemicals.length}] ${refKey}: FAILED: ${(e as Error).message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function loadCitySystems(city: CityRow): Promise<
  Array<{
    pws_name: string;
    grade: string | null;
    detections: Array<{
      compound_abbrev: string;
      avg_concentration: number | null;
      mcl: number | null;
      mcl_ratio: number | null;
    }>;
  }>
> {
  // Find systems for this city: by city_served name OR primary_pwsid
  const orParts: string[] = [`city_served.ilike.${city.city_name}`];
  if (city.primary_pwsid) orParts.push(`pwsid.eq.${city.primary_pwsid}`);

  const { data: sysRows } = await sb
    .from("water_systems")
    .select("pwsid, pws_name, grade, population_served")
    .eq("state_code", city.state_code)
    .or(orParts.join(","));

  let rows = sysRows ?? [];
  if (
    city.primary_pwsid &&
    !rows.find((s) => s.pwsid === city.primary_pwsid)
  ) {
    const { data: extra } = await sb
      .from("water_systems")
      .select("pwsid, pws_name, grade, population_served")
      .eq("pwsid", city.primary_pwsid)
      .maybeSingle();
    if (extra) rows.push(extra);
  }

  // Limit to top 6 by population to keep prompts reasonable.
  rows = rows
    .sort(
      (a, b) =>
        Number(b.population_served ?? 0) - Number(a.population_served ?? 0)
    )
    .slice(0, 6);

  const out = [];
  for (const s of rows) {
    const { data: dets } = await sb
      .from("detections")
      .select("compound_abbrev, avg_concentration, mcl, mcl_ratio")
      .eq("pwsid", s.pwsid)
      .order("mcl_ratio", { ascending: false, nullsFirst: false })
      .limit(15);

    out.push({
      pws_name: s.pws_name as string,
      grade: (s.grade as string | null) ?? null,
      detections: (dets ?? []).map((d) => ({
        compound_abbrev: d.compound_abbrev as string,
        avg_concentration:
          d.avg_concentration !== null ? Number(d.avg_concentration) : null,
        mcl: d.mcl !== null ? Number(d.mcl) : null,
        mcl_ratio: d.mcl_ratio !== null ? Number(d.mcl_ratio) : null,
      })),
    });
  }
  return out;
}

async function generateCitySummaries(): Promise<void> {
  console.log("\n=== City summaries ===");
  const { data: cities, error } = await sb
    .from("cities")
    .select(
      "slug, city_name, state_code, state_name, population, grade, primary_pwsid, contamination_source, settlement_status"
    )
    .in("launch_wave", [1, 2])
    .order("slug");
  if (error) throw error;
  if (!cities) return;

  console.log(`Found ${cities.length} launch cities`);

  let i = 0;
  for (const city of cities as CityRow[]) {
    i++;
    if (await isApproved("city_summary", city.slug)) {
      console.log(`  [${i}/${cities.length}] ${city.slug}: skipped (approved)`);
      continue;
    }

    try {
      const systems = await loadCitySystems(city);
      const body = await callClaude(buildCityPrompt(city, systems));
      await storeContent({
        content_type: "city_summary",
        reference_key: city.slug,
        title: `PFAS in ${city.city_name}, ${city.state_code} Drinking Water`,
        body,
      });
      console.log(
        `  [${i}/${cities.length}] ${city.slug}: generated (${body.length} chars)`
      );
    } catch (e) {
      console.error(
        `  [${i}/${cities.length}] ${city.slug}: FAILED: ${(e as Error).message}`
      );
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

async function main() {
  await generateChemicalExplainers();
  await generateCitySummaries();

  // Sonnet 4.x pricing: ~$3 / 1M input, ~$15 / 1M output (rough estimate).
  const cost =
    (totalInputTokens / 1_000_000) * 3 +
    (totalOutputTokens / 1_000_000) * 15;
  console.log("\n=== Done ===");
  console.log(`Model: ${modelInUse}`);
  console.log(
    `Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`
  );
  console.log(`Estimated cost: $${cost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
