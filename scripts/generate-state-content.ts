/**
 * Generate "What [State] is doing about PFAS" content for every state.
 *
 * For each of the 50 states + DC this script:
 *   1. Runs 1-3 Anthropic web search queries sized to the state's tier
 *   2. Feeds the search results + this project's own aggregate data into a
 *      Claude prompt that produces 1-5 paragraphs of policy context
 *   3. Writes the result to data/state-content.json keyed by state code
 *
 * Run: npx tsx scripts/generate-state-content.ts
 *
 * Re-running is safe. Existing entries are overwritten by default, but you
 * can pass STATE=MI to regenerate a single state, or TIER=1 to refresh only
 * the deeply researched tier 1 list.
 */
import * as fs from "fs";
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

const PRIMARY_MODEL = "claude-sonnet-4-6-20250514";
const FALLBACK_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-5"];
const MAX_TOKENS = 1800;
const REQUEST_DELAY_MS = 500;

const OUTPUT_FILE = path.join(__dirname, "..", "content", "state-content.json");

interface StateDef {
  code: string;
  name: string;
}

const STATES: StateDef[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

const TIER_1 = new Set([
  "MI", "NJ", "VT", "NH", "MA", "ME", "CA", "MN", "WI", "NY",
  "NC", "PA", "CT", "RI", "CO", "OH",
]);

interface AggregateStats {
  total_systems: number;
  total_population: number;
  systems_with_exceedances: number;
  population_with_exceedances: number;
}

async function fetchAggregate(stateCode: string): Promise<AggregateStats> {
  const PAGE = 1000;
  let offset = 0;
  let total_systems = 0;
  let total_population = 0;
  let systems_with_exceedances = 0;
  let population_with_exceedances = 0;
  while (true) {
    const { data, error } = await sb
      .from("water_systems")
      .select("pwsid, population_served, worst_ratio")
      .eq("state_code", stateCode)
      .order("pwsid")
      .range(offset, offset + PAGE - 1);
    if (error) break;
    const rows = data ?? [];
    for (const r of rows) {
      total_systems++;
      const pop = Number(r.population_served ?? 0) || 0;
      total_population += pop;
      const wr = Number(r.worst_ratio ?? 0) || 0;
      if (wr > 1.0) {
        systems_with_exceedances++;
        population_with_exceedances += pop;
      }
    }
    if (rows.length < PAGE) break;
    offset += PAGE;
    if (offset > 50_000) break;
  }
  return {
    total_systems,
    total_population,
    systems_with_exceedances,
    population_with_exceedances,
  };
}

function tier(code: string, exceedances: number): 1 | 2 | 3 {
  if (TIER_1.has(code)) return 1;
  if (exceedances > 5) return 2;
  return 3;
}

function queriesFor(name: string, tierN: 1 | 2 | 3): string[] {
  const base = [
    `${name} PFAS drinking water regulation 2025 2026`,
    `${name} PFAS MCL state standards`,
    `${name} PFAS legislation site:.gov`,
  ];
  if (tierN === 1) return base;
  if (tierN === 2) return base.slice(0, 2);
  return base.slice(0, 1);
}

function paragraphsFor(tierN: 1 | 2 | 3): string {
  if (tierN === 1) return "4 to 5 paragraphs";
  if (tierN === 2) return "2 to 3 paragraphs";
  return "1 to 2 paragraphs";
}

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

async function callClaudeWithSearch(
  prompt: string,
  searches: string[]
): Promise<string> {
  // Use Anthropic's server-side web_search_20250305 tool so the model
  // fetches up-to-date context. If that tool is unavailable the model
  // will fall back to its own knowledge.
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  for (const model of modelsToTry) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        messages: [
          {
            role: "user",
            content: `Before you answer, run these web searches and use the results: ${searches
              .map((q) => `"${q}"`)
              .join(", ")}.\n\n${prompt}`,
          },
        ],
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: searches.length,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404 || /model|tool/i.test(body)) {
        console.warn(`  model ${model} failed (${res.status}); trying next`);
        continue;
      }
      throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = (await res.json()) as AnthropicResponse;
    const text = data.content
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("\n")
      .trim();
    if (text) return text;
  }
  throw new Error("All models failed to produce text");
}

function buildPrompt(
  state: StateDef,
  stats: AggregateStats,
  tierN: 1 | 2 | 3
): string {
  return `You are writing a short factual policy brief for a state legislator.

STATE: ${state.name}
EPA UCMR 5 aggregate data for ${state.name}:
  - water systems tested: ${stats.total_systems}
  - population served: ${stats.total_population}
  - systems exceeding federal PFAS limits: ${stats.systems_with_exceedances}
  - population affected by exceedances: ${stats.population_with_exceedances}

TASK: Write ${paragraphsFor(
    tierN
  )} about what ${state.name} has done to address PFAS contamination in drinking water.

COVER:
  - state-level Maximum Contaminant Levels if they exist, with the actual numbers and how they compare to the federal EPA limits (PFOA 4 ppt, PFOS 4 ppt, PFHxS 10 ppt, PFNA 10 ppt, HFPO-DA 10 ppt, finalized April 2024)
  - legislation passed, with the bill name or a brief description
  - enforcement actions or state PFAS response programs
  - major ongoing litigation involving the state or in-state polluters
If the state has done very little, say so plainly. Then add one sentence about the federal compliance timeline (initial monitoring by 2027, treatment installation by 2029).

RULES:
  - No em dashes anywhere. Use commas or sentence breaks instead.
  - No AI-sounding language. Do not use the words: comprehensive, robust, crucial, leverage, utilize, furthermore, notably, delve, landscape, navigate, tapestry.
  - Attribute specific claims with phrases like "state records show", "the legislature passed", "the governor signed", "according to the state environmental agency".
  - Hedge on dates from web research. Prefer "in late 2024" over specific month/day unless clearly verified.
  - If litigation is ongoing, note it without predicting outcomes.
  - Write like a policy researcher, not a journalist or advocate.
  - Plain paragraphs only. No headings, no bullet points, no bold, no markdown.
  - Separate paragraphs with a blank line.
  - Total length target for this tier: ${paragraphsFor(tierN)}.`;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function stripEmDashes(paragraphs: string[]): string[] {
  return paragraphs.map((p) =>
    p
      .replace(/\u2014/g, ", ")
      .replace(/ - /g, ", ")
      .replace(/,\s+,/g, ",")
      .trim()
  );
}

async function main() {
  const onlyState = process.env.STATE;
  const onlyTier = process.env.TIER ? Number(process.env.TIER) : null;

  // Load existing file so we can merge without clobbering unchanged entries.
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
  } catch {
    existing = {};
  }

  for (const state of STATES) {
    if (onlyState && state.code !== onlyState) continue;

    const stats = await fetchAggregate(state.code);
    const tierN = tier(state.code, stats.systems_with_exceedances);
    if (onlyTier && tierN !== onlyTier) continue;

    console.log(
      `[${state.code}] tier ${tierN}, systems=${stats.total_systems}, exc=${stats.systems_with_exceedances}`
    );

    const searches = queriesFor(state.name, tierN);
    const prompt = buildPrompt(state, stats, tierN);
    try {
      const raw = await callClaudeWithSearch(prompt, searches);
      const paragraphs = stripEmDashes(splitParagraphs(raw));
      (existing as Record<string, unknown>)[state.code] = {
        paragraphs,
        attribution: "Generated from public records and EPA UCMR 5 data.",
        tier: tierN,
        generated_at: new Date().toISOString(),
      };
      fs.writeFileSync(
        OUTPUT_FILE,
        JSON.stringify(existing, null, 2),
        "utf-8"
      );
      console.log(`  wrote ${paragraphs.length} paragraphs`);
    } catch (e) {
      console.error(`  [${state.code}] FAILED: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
