/**
 * Rewrite the city_summary content rows for the seven launch cities whose
 * municipal water tests clean under UCMR 5 but whose communities are known
 * for serious historical PFAS contamination. The default city-summary
 * prompt produces "grade A, no detections, you're fine" copy that hides
 * the real story. This script feeds Claude an extended prompt with the
 * historical context for each city so the resulting summary explains both
 * the current clean test results AND the contamination history.
 *
 * Newburgh is included with a different framing because the City of
 * Newburgh tests clean after treatment, but the Town of Newburgh
 * Consolidated Water District still exceeds the federal PFOA limit.
 *
 * No em dashes in the prompt, and the prompt explicitly forbids them in
 * the output. A safety net dedasher runs over the result before upsert.
 *
 * Run: npx tsx scripts/regenerate-launch-summaries.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
if (!SUPABASE_URL || !SERVICE_KEY || !ANTHROPIC_API_KEY) {
  throw new Error("Supabase or Anthropic credentials missing from .env.local");
}

const sb: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const PRIMARY_MODEL = "claude-sonnet-4-6-20250514";
const FALLBACK_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-5"];
const MAX_TOKENS = 1200;
const TEMPERATURE = 0.3;

let modelInUse = PRIMARY_MODEL;

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
}

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
      if (res.status === 404 || /model/i.test(body)) {
        console.warn(`  model ${model} failed (${res.status}); trying next...`);
        continue;
      }
      throw new Error(`Anthropic API error: ${lastErr}`);
    }
    const data = (await res.json()) as AnthropicResponse;
    if (model !== modelInUse) {
      console.log(`  switched to ${model}`);
      modelInUse = model;
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

function dedash(s: string): string {
  if (!s.includes("\u2014")) return s;
  return s.replace(/\s*\u2014\s*/g, ", ").replace(/, ,/g, ",").replace(/, \./g, ".");
}

interface CityCase {
  slug: string;
  cityName: string;
  stateName: string;
  /** "clean" = municipal supply tests clean, story is historical/private wells */
  /** "split" = multiple systems, at least one still over limits (Newburgh)  */
  framing: "clean" | "split";
  /** Brief, hedged contamination context for the prompt input. */
  context: string;
}

const CASES: CityCase[] = [
  {
    slug: "merrimack-nh",
    cityName: "Merrimack",
    stateName: "New Hampshire",
    framing: "clean",
    context: `Beginning in the mid-2010s, PFOA contamination from the nearby Saint-Gobain Performance Plastics facility was discovered in private wells and detected at concerning levels in several Merrimack Village District public supply wells. Under a state consent agreement with the New Hampshire Department of Environmental Services, Saint-Gobain funded the installation of granular activated carbon (GAC) treatment for the Merrimack Village District public water supply. The treatment system has been operating for several years. A separate Saint-Gobain remediation deal signed in March 2026 continues remediation work for affected private wells. The Merrimack Village District serves roughly 25,000 people.`,
  },
  {
    slug: "hoosick-falls-ny",
    cityName: "Hoosick Falls",
    stateName: "New York",
    framing: "clean",
    context: `In 2014, resident Michael Hickey identified PFOA contamination in the Village of Hoosick Falls public water supply and traced it to local Saint-Gobain and Honeywell plastics manufacturing operations. The discovery became one of the foundational stories of the United States PFAS crisis and helped catalyze federal action. The village installed granular activated carbon treatment and developed alternative water sources later in the 2010s. Saint-Gobain and Honeywell entered settlements with the village and affected residents that have since been resolved. The village water supply serves about 4,900 people.`,
  },
  {
    slug: "bennington-vt",
    cityName: "Bennington",
    stateName: "Vermont",
    framing: "clean",
    context: `Bennington's PFAS contamination story centers on PFOA released by the former ChemFab fabric coating plant later acquired by Saint-Gobain. The contamination plume affected hundreds of private drinking water wells in Bennington and North Bennington. However, the public water systems (Bennington Water Department and North Bennington Water Department) draw from sources outside the main contamination plume and were not contaminated to a significant degree. A Saint-Gobain settlement funded municipal water line extensions to many affected private well owners and ongoing remediation work, which is still expanding as new contamination is identified. The municipal system serves roughly 13,000 people; North Bennington serves another 1,700.`,
  },
  {
    slug: "newburgh-ny",
    cityName: "Newburgh",
    stateName: "New York",
    framing: "split",
    context: `Two distinct water utilities serve the Newburgh area. The City of Newburgh historically drew from Washington Lake, which was contaminated by PFOS-containing aqueous film-forming foam (AFFF) firefighting foam from Stewart Air National Guard Base. After PFAS levels were detected in 2016, the City of Newburgh stopped using Washington Lake, switched to alternate sources, and installed granular activated carbon treatment. UCMR 5 testing of the City of Newburgh's treated supply (PWSID NY3503549) shows no PFAS above the EPA Minimum Reporting Level. The Town of Newburgh Consolidated Water District (PWSID NY3503578) is a separate utility serving roughly 22,000 people in the surrounding area. UCMR 5 testing of the Consolidated Water District found PFOA at approximately 1.08 times the EPA Maximum Contaminant Level of 4.0 parts per trillion, which exceeds the federal limit. Customers of the City of Newburgh are protected by the city's treatment investment; customers of the Town of Newburgh Consolidated Water District are not yet protected by equivalent treatment. Senators Schumer and Gillibrand have publicly pressed for federal action and settlement eligibility for the affected systems.`,
  },
  {
    slug: "marinette-wi",
    cityName: "Marinette",
    stateName: "Wisconsin",
    framing: "clean",
    context: `Marinette is associated with the broader PFAS contamination story originating at the Tyco Fire Products fire-training facility (now part of Johnson Controls) located in the adjacent Town of Peshtigo, where decades of AFFF foam testing released PFAS into local groundwater and surface water. The contamination has primarily affected private drinking water wells in unincorporated rural areas around the JCI facility, not the City of Marinette's municipal customers. The City of Marinette's water utility, Marinette Waterworks, draws from Lake Michigan and was not directly contaminated. The Tyco/Johnson Controls settlement continues to fund response actions for affected private well owners outside the city. Marinette Waterworks serves roughly 11,000 people.`,
  },
  {
    slug: "peshtigo-wi",
    cityName: "Peshtigo",
    stateName: "Wisconsin",
    framing: "clean",
    context: `The City of Peshtigo and the Town of Peshtigo are two separate jurisdictions with very different water situations. The famous PFAS contamination from the Tyco/Johnson Controls fire-training facility has primarily affected private drinking water wells in the unincorporated Town of Peshtigo, where Tyco continues to provide bottled water and point-of-entry treatment for affected households under a Wisconsin Department of Natural Resources enforcement action. The City of Peshtigo's municipal water supply, Peshtigo Waterworks, serves about 3,400 people on a different water source than the affected private wells. UCMR 5 testing of Peshtigo Waterworks found no PFAS above the Minimum Reporting Level. City customers and the rural well users in the Town of Peshtigo have very different exposure profiles even though the headlines about Peshtigo make no such distinction.`,
  },
  {
    slug: "oscoda-mi",
    cityName: "Oscoda",
    stateName: "Michigan",
    framing: "clean",
    context: `Oscoda is the location of the former Wurtsmith Air Force Base, one of the most studied AFFF firefighting foam contamination sites in the country. PFAS released during decades of base operations has contaminated groundwater in the area, affecting private drinking water wells and surface water in the Au Sable River watershed. The Department of Defense is conducting ongoing remediation, and many affected private well users have received bottled water or point-of-entry treatment. Oscoda Township's municipal public water supply draws from a different source than the affected groundwater and serves about 7,000 people. The contamination story for Oscoda is overwhelmingly about base-related groundwater pollution affecting private wells and surface water, not the township's municipal customers.`,
  },
];

function buildPrompt(c: CityCase, systemsBlock: string): string {
  const framingNote =
    c.framing === "split"
      ? `IMPORTANT: This city is served by TWO separate water utilities. One tested clean after installing treatment; the other still tests above the federal PFOA limit. The summary MUST distinguish between them clearly so a customer knows which utility serves them and what that means.`
      : `IMPORTANT: This community is famous for PFAS contamination, but the contamination story is primarily about private wells in surrounding rural areas, not the municipal water system. The municipal supply currently tests clean under UCMR 5. The summary MUST explain this distinction so visitors understand why the public water system has a clean grade while the community as a whole has a contamination history.`;

  return `You are a local news writer producing a factual community summary for a public health journalism tool used by reporters, city council members, and concerned residents. Write a clear, hedged, well-sourced summary that takes the historical contamination context seriously without overstating what the current data shows.

CITY: ${c.cityName}, ${c.stateName}

UCMR 5 TESTING RESULTS BY WATER SYSTEM:
${systemsBlock}

HISTORICAL CONTAMINATION CONTEXT (use this as background; weave it into the narrative):
${c.context}

${framingNote}

Write EXACTLY these 3 sections with these exact headings:

## Summary
One paragraph (4 to 5 sentences). Lead with what UCMR 5 testing currently shows for the public water system or systems serving this city. Then immediately pivot to the historical contamination context, explaining what happened, who was responsible (named in the context above), and what was done about it (treatment, source switching, settlements, ongoing remediation). For the split case (multiple systems with different results), make the distinction explicit in this paragraph.

## What the data shows
One paragraph (3 to 4 sentences). Walk through the specific UCMR 5 testing results in plain language. Name each water system serving the city by name. State whether each was tested, how many compounds were checked, and what was found (or not found). Use precise language: "no PFAS above the EPA Minimum Reporting Level" rather than vague "clean."

## What residents should know
One paragraph (3 to 4 sentences). Explain who is and is not protected by the current situation. For the clean cases, acknowledge that private well users in the surrounding area may still be affected and should not assume they share the municipal system's results. For the split case, tell customers of each utility what their result means and what they should do next. Direct readers to their water utility for the most current information and to the action page for filter recommendations if they have any concerns.

ABSOLUTE RULES:
- DO NOT use em dashes (the long dash character). Use commas, periods, semicolons, parentheses, or rewrite the sentence.
- Do not use the word "comprehensive" or "robust" or "leverage" or "utilize". Use plain words.
- Hedge claims about historical events with phrases like "in the mid-2010s" or "later in the 2010s" rather than inventing specific years not in the context above.
- Never say a chemical "causes" a health effect. The summary should be about water testing, not health.
- Never provide medical advice.
- Tone: a local newspaper reporter who has done their homework. Direct, factual, fair to all parties named, not hysterical and not dismissive.
- Total length: 280 to 380 words.
- Do not add any sections beyond the 3 listed above.
- Do not add a disclaimer. The site handles that separately.`;
}

interface SystemRow {
  pwsid: string;
  pws_name: string;
  grade: string | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number | null;
}

async function loadSystemsForCity(cityName: string, stateCode: string): Promise<string> {
  const { data: rows } = await sb
    .from("water_systems")
    .select("pwsid, pws_name, grade, worst_compound, worst_ratio, total_pfas_detected")
    .eq("state_code", stateCode)
    .ilike("city_served", cityName);
  const systems = (rows ?? []) as SystemRow[];
  if (systems.length === 0) return "  (no systems found)";

  const lines: string[] = [];
  for (const s of systems) {
    const ratio =
      s.worst_ratio !== null ? `${Number(s.worst_ratio).toFixed(2)}x EPA MCL` : "no compound above the federal limit";
    const det = s.total_pfas_detected ?? 0;
    lines.push(
      `- ${s.pws_name} (PWSID ${s.pwsid}), grade ${s.grade ?? "n/a"}, ${det} compound(s) detected above the Minimum Reporting Level, worst compound: ${s.worst_compound ?? "none"} at ${ratio}.`
    );

    const { data: dets } = await sb
      .from("detections")
      .select("compound_abbrev, avg_concentration, mcl, mcl_ratio, detection_count, sample_count")
      .eq("pwsid", s.pwsid)
      .order("mcl_ratio", { ascending: false, nullsFirst: false });
    const detected = (dets ?? []).filter(
      (d) => (d.detection_count ?? 0) > 0 || (d.avg_concentration ?? null) !== null
    );
    if (detected.length === 0) {
      lines.push(`    (UCMR 5: all 29 compounds non-detect across all samples)`);
    } else {
      for (const d of detected.slice(0, 8)) {
        const conc = d.avg_concentration !== null ? `${d.avg_concentration} ppt` : "concentration not reported";
        const r = d.mcl_ratio !== null ? ` (${Number(d.mcl_ratio).toFixed(2)}x the EPA limit of ${d.mcl} ppt)` : "";
        lines.push(`    ${d.compound_abbrev}: ${conc}${r}`);
      }
    }
  }
  return lines.join("\n");
}

const STATE_CODE: Record<string, string> = {
  "merrimack-nh": "NH",
  "hoosick-falls-ny": "NY",
  "bennington-vt": "VT",
  "newburgh-ny": "NY",
  "marinette-wi": "WI",
  "peshtigo-wi": "WI",
  "oscoda-mi": "MI",
};

async function regenerate(c: CityCase) {
  const stateCode = STATE_CODE[c.slug];
  console.log(`\n--- ${c.slug} ---`);
  const systemsBlock = await loadSystemsForCity(c.cityName, stateCode);
  const prompt = buildPrompt(c, systemsBlock);
  const raw = await callClaude(prompt);
  const body = dedash(raw);
  if (body.includes("\u2014")) {
    throw new Error(`em dash survived dedash for ${c.slug}`);
  }
  const title = `PFAS in ${c.cityName}, ${stateCode} Drinking Water`;
  const { error } = await sb.from("content").upsert(
    {
      content_type: "city_summary",
      reference_key: c.slug,
      title,
      body,
      model_used: modelInUse,
      generation_date: new Date().toISOString(),
      review_status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "content_type,reference_key" }
  );
  if (error) throw error;
  console.log(`  upserted ${body.length} chars`);
  console.log(`  preview: ${body.slice(0, 200).replace(/\s+/g, " ")}...`);
}

async function main() {
  for (const c of CASES) {
    try {
      await regenerate(c);
    } catch (e) {
      console.error(`  FAILED: ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  console.log("\ndone");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
