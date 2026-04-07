/**
 * Generate the /content/blog/*.mdx files using Claude Sonnet.
 *
 *   - 6 city investigations (one per city in scripts/blog-data/*.json)
 *   - 4 evergreen explainers (defined inline below)
 *
 * Inputs:
 *   - scripts/blog-data/<slug>.json     (real PFAS data pulled from Supabase)
 *   - scripts/blog-data/_research.json  (web research summaries with sources)
 *   - scripts/blog-data/_chemicals.json (UCMR 5 chemicals reference)
 *
 * Output:
 *   - content/blog/<slug>.mdx
 *
 * Each generated file is post-processed to strip em dashes and a small set
 * of AI-tell phrases before it's written to disk. Re-running this script
 * overwrites existing files.
 *
 * Run: npx tsx scripts/generate-blog-articles.ts
 *      npx tsx scripts/generate-blog-articles.ts --only=parkersburg-wv
 */
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY missing");

const PRIMARY_MODEL = "claude-sonnet-4-5";
const FALLBACK_MODELS = ["claude-sonnet-4-6", "claude-sonnet-4-6-20250514"];
const MAX_TOKENS = 4096;
const TEMPERATURE = 0.4;

const ARGS = process.argv.slice(2);
const ONLY = ARGS.find((a) => a.startsWith("--only="))?.split("=")[1];

const BLOG_DATA_DIR = path.join(__dirname, "blog-data");
const OUT_DIR = path.join(__dirname, "..", "content", "blog");
fs.mkdirSync(OUT_DIR, { recursive: true });

interface AnthropicResponse {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens: number; output_tokens: number };
}

let totalIn = 0;
let totalOut = 0;

async function callClaude(system: string, user: string): Promise<string> {
  const tryModels = [PRIMARY_MODEL, ...FALLBACK_MODELS];
  let lastErr: string | null = null;
  for (const model of tryModels) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      lastErr = `${model}: ${res.status} ${t.slice(0, 200)}`;
      console.warn(`  model fallback: ${lastErr}`);
      continue;
    }
    const json = (await res.json()) as AnthropicResponse;
    if (json.usage) {
      totalIn += json.usage.input_tokens;
      totalOut += json.usage.output_tokens;
    }
    const text = json.content.find((c) => c.type === "text")?.text ?? "";
    if (!text) {
      lastErr = `${model}: empty content`;
      continue;
    }
    return text;
  }
  throw new Error(`All models failed. Last: ${lastErr}`);
}

// ----- post-processing: dedash + AI-tell scrub --------------------------------

const BANNED_PHRASES: Array<{ pattern: RegExp; replace: string | null; reason: string }> = [
  // Em dashes — collapse to comma+space (matches scripts/dedash-content.ts).
  { pattern: /\s*\u2014\s*/g, replace: ", ", reason: "em dash" },
  // En dashes used as range separators are fine in dates (2023–2026), keep those.
  // En dashes as sentence breaks → comma.
  { pattern: /\s+\u2013\s+/g, replace: ", ", reason: "en dash sentence break" },
  // AI-obvious words. Mostly remove or replace.
  { pattern: /\bcomprehensive\b/gi, replace: "full", reason: "comprehensive" },
  { pattern: /\brobust\b/gi, replace: "strong", reason: "robust" },
  { pattern: /\bcrucial\b/gi, replace: "important", reason: "crucial" },
  { pattern: /\bfurthermore,?\s*/gi, replace: "Also, ", reason: "furthermore" },
  { pattern: /\bnotably,?\s*/gi, replace: "", reason: "notably" },
  { pattern: /\butilize(d|s)?\b/gi, replace: "use", reason: "utilize" },
  { pattern: /\bleverage(d|s)?\b/gi, replace: "use", reason: "leverage" },
  { pattern: /\bin order to\b/gi, replace: "to", reason: "in order to" },
  { pattern: /\bdelve into\b/gi, replace: "look at", reason: "delve into" },
  { pattern: /\bnavigate the complexities of\b/gi, replace: "deal with", reason: "navigate complexities" },
  { pattern: /\bplays? a (key|pivotal|crucial) role\b/gi, replace: "matters", reason: "plays a role" },
  { pattern: /\bin today's (rapidly )?evolving (landscape|world)\b/gi, replace: "today", reason: "evolving landscape" },
  { pattern: /\bit('s| is) (worth|important to) (noting|note) that\b/gi, replace: "Note:", reason: "worth noting" },
  // Common AI sentence starters
  { pattern: /\bIn conclusion,\s*/gi, replace: "", reason: "in conclusion" },
  { pattern: /\bUltimately,\s*/gi, replace: "", reason: "ultimately" },
];

// Belt-and-suspenders: any US-style phone number that slipped through is
// almost certainly a hallucination, since we explicitly told the model not to
// invent contact details. Strip the entire sentence containing one.
const PHONE_RE = /\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g;

function stripPhoneSentences(s: string): { out: string; removed: number } {
  let removed = 0;
  // Split into sentences (rough), drop any that contains a phone-like number.
  const out = s.replace(/[^.!?\n]*[.!?]/g, (sentence) => {
    if (PHONE_RE.test(sentence)) {
      PHONE_RE.lastIndex = 0;
      removed += 1;
      return "";
    }
    return sentence;
  });
  return { out: out.replace(/  +/g, " ").replace(/\n{3,}/g, "\n\n"), removed };
}

function scrub(s: string): { out: string; counts: Record<string, number> } {
  let out = s;
  const counts: Record<string, number> = {};
  for (const rule of BANNED_PHRASES) {
    const matches = out.match(rule.pattern);
    if (matches && matches.length > 0) {
      counts[rule.reason] = (counts[rule.reason] ?? 0) + matches.length;
      out = out.replace(rule.pattern, rule.replace ?? "");
    }
  }
  const phoneStrip = stripPhoneSentences(out);
  if (phoneStrip.removed > 0) {
    counts["phone-sentence"] = phoneStrip.removed;
    out = phoneStrip.out;
  }
  // Tidy artifacts.
  out = out.replace(/, ,/g, ",");
  out = out.replace(/, \./g, ".");
  out = out.replace(/  +/g, " ");
  out = out.replace(/^\s*Note:\s+/gm, "");
  return { out, counts };
}

// ----- shared writing guidelines for the system prompt -----------------------

const SHARED_VOICE = `You are an investigative journalist writing for CheckYourWater, a public-service journalism resource that turns EPA water-quality data into plain-language local reporting. You care about the communities you write about. You are not trying to scare anyone. You are trying to inform them so they can make decisions and take action.

Voice and style:
- Write at an 8th grade reading level. Short sentences. Concrete nouns. Active verbs.
- Sound like a careful, professional local reporter, not a press release and not a chatbot.
- Let the data speak. "PFOA was detected at 7.3 times the federal limit" is more powerful than "dangerously contaminated."
- Never editorialize and never fear-monger. Report what the data shows and what experts say. Attribute everything.
- When there is good news (cleanup worked, treatment installed), report it honestly. Don't manufacture alarm.

ABSOLUTELY NEVER use these words or punctuation:
- Em dashes (—). Use a comma and a space, or split the sentence.
- "Comprehensive", "robust", "crucial", "furthermore", "notably", "utilize", "leverage", "in order to", "delve into", "navigate the complexities of", "plays a key role", "in conclusion", "ultimately", "in today's evolving landscape", "it's worth noting that".
- Marketing voice. No "we believe", "we're committed to", "stay tuned".
- AI hedge phrases ("It's important to remember", "It is essential to note").

Formatting:
- Output ONLY the article body in GitHub-flavored Markdown. No frontmatter, no title at the top (the title is set separately).
- Use "## " for the section headings exactly as instructed in the prompt. Use "### " sparingly for subheads.
- Use bullet lists where helpful but prose-first.
- Inline links with [text](url) for sources.

Numbers:
- Cite EXACT numbers from the data provided. Never make up a number. Never round in ways that change meaning.
- The federal MCLs (set by the EPA in April 2024) are: PFOA 4 ppt, PFOS 4 ppt, PFHxS 10 ppt, PFNA 10 ppt, HFPO-DA (GenX) 10 ppt. PFOA and PFOS also contribute to a Hazard Index for mixtures.
- "ppt" means parts per trillion.
- Compliance monitoring deadline: 2027 for initial monitoring, 2029 for full compliance with treatment requirements.

Hard rules to prevent hallucination:
- NEVER invent or include a phone number. Not for utilities, not for state agencies, not for anyone. If you want the reader to contact someone, say "contact your water utility" or "search '<utility name> consumer confidence report' online" or "use the EPA's CCR lookup at epa.gov/ccr".
- NEVER invent a street address or a meeting time. Say "check the utility's website for the meeting schedule" instead.
- NEVER invent specific dollar settlement amounts, lawsuit case numbers, or court ruling dates that are not in the research provided.
- NEVER invent the names of individual officials, lawyers, or scientists unless they appear in the research provided.
- If you don't have a specific fact in the data or research provided, write around it. Fewer specifics is better than wrong specifics.
`;

// ----- city investigation prompt builder -------------------------------------

interface DetectionPlain {
  compound_abbrev: string;
  compound_name: string;
  avg_concentration: number | null;
  max_concentration: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  detection_count: number | null;
  sample_count: number | null;
}
interface SystemPlain {
  pwsid: string;
  pws_name: string;
  population_served: number | null;
}
interface CityDataFile {
  city: {
    slug: string;
    city_name: string;
    state_code: string;
    state_name: string;
    grade: string | null;
    contamination_source: string | null;
  };
  systems: SystemPlain[];
  detections: DetectionPlain[];
  totals: {
    systems: number;
    population_served: number | null;
    detections: number;
    exceedances: number;
  };
}

function detectionLine(d: DetectionPlain): string | null {
  // Only include detections that actually have a measurement.
  if (d.avg_concentration === null && d.max_concentration === null) return null;
  const parts: string[] = [];
  parts.push(`${d.compound_abbrev}`);
  if (d.avg_concentration !== null) parts.push(`avg ${d.avg_concentration} ppt`);
  if (d.max_concentration !== null && d.max_concentration !== d.avg_concentration)
    parts.push(`max ${d.max_concentration} ppt`);
  if (d.mcl !== null) parts.push(`MCL ${d.mcl} ppt`);
  if (d.mcl_ratio !== null)
    parts.push(`${d.mcl_ratio.toFixed(2)}x federal limit`);
  if (d.detection_count !== null && d.sample_count !== null)
    parts.push(`detected in ${d.detection_count}/${d.sample_count} samples`);
  return "  - " + parts.join(", ");
}

function buildCityPrompt(data: CityDataFile, research: any): { system: string; user: string } {
  const { city, systems, detections, totals } = data;
  const detectedRows = detections
    .map(detectionLine)
    .filter((x): x is string => x !== null);

  const exceedanceRows = detections.filter((d) => (d.mcl_ratio ?? 0) >= 1);
  const worstByRatio = [...detections]
    .filter((d) => d.mcl_ratio !== null)
    .sort((a, b) => (b.mcl_ratio ?? 0) - (a.mcl_ratio ?? 0));

  const sourceList = (research?.sources ?? [])
    .map(
      (s: { outlet: string; headline: string; url: string }, i: number) =>
        `  ${i + 1}. ${s.outlet}, "${s.headline}" — ${s.url}`
    )
    .join("\n");

  const factList = (research?.headline_facts ?? [])
    .map((f: string, i: number) => `  ${i + 1}. ${f}`)
    .join("\n");

  const user = `Write a city investigation article for ${city.city_name}, ${city.state_code}.

# REAL DATA FROM EPA UCMR 5 (use these numbers exactly)
City: ${city.city_name}, ${city.state_name} (${city.state_code})
Letter grade in our database: ${city.grade ?? "ungraded"}
Total population served by tested systems: ${totals.population_served ?? "unknown"}
Number of systems tested: ${totals.systems}
Total compounds with measurements: ${detectedRows.length}
Total compounds exceeding federal MCLs: ${totals.exceedances}

Water systems serving this city:
${systems.map((s) => `  - ${s.pws_name} (PWSID ${s.pwsid}, serves ${s.population_served ?? "unknown"} people)`).join("\n")}

PFAS compounds detected (with measured concentrations):
${detectedRows.length > 0 ? detectedRows.join("\n") : "  (no compounds with measured concentrations)"}

Compounds exceeding federal MCLs:
${
  exceedanceRows.length === 0
    ? "  NONE — all compounds tested below federal limits."
    : exceedanceRows
        .map(
          (d) =>
            `  - ${d.compound_abbrev}: avg ${d.avg_concentration} ppt vs ${d.mcl} ppt MCL = ${(d.mcl_ratio ?? 0).toFixed(2)}x federal limit`
        )
        .join("\n")
}

Worst single result (by ratio to MCL):
${
  worstByRatio[0]
    ? `${worstByRatio[0].compound_abbrev} at ${(worstByRatio[0].mcl_ratio ?? 0).toFixed(2)}x the federal limit (${worstByRatio[0].avg_concentration} ppt vs ${worstByRatio[0].mcl} ppt MCL)`
    : "No exceedances in current EPA UCMR 5 data."
}

Database note on contamination source: ${city.contamination_source ?? "(none in DB)"}

# RESEARCH CONTEXT (cite these where relevant — link by URL)
Key facts:
${factList}

Sources to cite (use these URLs as inline markdown links):
${sourceList}

# ARTICLE STRUCTURE — follow exactly. Use these EXACT H2 headings.
The article should be 900 to 1200 words, MDX/markdown, no top title.

## What testing found in ${city.city_name}'s water
- Lead with the most newsworthy specific finding from the data above. If there are exceedances, name the worst one in the first sentence.
- List every compound that was detected with a measurement, with its level and (if applicable) ratio to the MCL.
- Note the affected system name and the population it serves.
- If finished water has since been treated, say so honestly using the research context, and note that UCMR 5 sampling was collected between 2023 and 2026.
- One short paragraph: the EPA finalized these limits in April 2024 after determining there is no safe level of exposure to PFOA and PFOS.

## What this means for ${city.city_name} residents
- Plain-language health context for the SPECIFIC compounds detected here. PFOA: kidney cancer, testicular cancer, liver damage, immune effects, developmental effects per EPA. PFOS: similar. Be conservative and accurate. Attribute to "the EPA" or "the C8 Science Panel" when relevant.
- Vulnerable groups: pregnant women, infants, immunocompromised people.
- Exposure routes: drinking, cooking with the water, formula prep. Bathing/showering exposure to PFAS is minimal — say so accurately.

## Where these chemicals came from
- Tell the local contamination story using the research above. Cite the news outlet inline with [outlet name](url) format.
- Be specific: name the company, the facility, the year, the lawsuit, the settlement.

## What ${city.city_name} is doing about it
- Pull from the research context. What has the utility done? What treatment is installed? What state action exists?
- If the cleanup story is genuine, report it honestly. "The Parkersburg Utility Board installed granular activated carbon treatment and reports finished water now meets federal standards" is the kind of sentence we want when it's true.
- If there's nothing in the research, say plainly: "CheckYourWater was unable to find recent public statements from [utility name] regarding their PFAS testing results."

## Steps ${city.city_name} residents can take today
A bulleted action list. Be concrete:
- How to request the full Consumer Confidence Report from the utility.
- Install an NSF/ANSI 53 certified pitcher or under-sink filter, or an NSF/ANSI 58 reverse osmosis system. NSF 53 is for activated carbon (pitcher and under-sink). NSF 58 is for RO under-sink. Both have specific PFAS certifications to look for.
- For households with infants: use filtered water for formula.
- Attend local water board and city council meetings.
- Link to /action and to the system page /system/${systems[0]?.pwsid ?? ""}.

## Full test results
- Brief paragraph linking to the system data page: /system/${systems[0]?.pwsid ?? ""}
- "Data from EPA's Unregulated Contaminant Monitoring Rule 5 (UCMR 5) program. Samples collected 2023-2026. UCMR 5 tests are taken at the entry point to the distribution system, before any household-level filtration."

# RULES
- Cite real numbers from the data block above. Do not invent numbers.
- Inline link to source URLs: [Outlet Name](https://example.com).
- The article should read as if written by a careful local reporter. NOT like ChatGPT.
- NO em dashes. Use commas or split sentences.
- Forbidden words: comprehensive, robust, crucial, furthermore, notably, utilize, leverage, in order to.
- Output ONLY the article body in markdown. No frontmatter. No title at the top. Start directly with the first "## " heading.`;

  return { system: SHARED_VOICE, user };
}

// ----- explainer prompts -----------------------------------------------------

interface ExplainerSpec {
  slug: string;
  title: string;
  description: string;
  category: "explainer" | "guide";
  user: (chemicalsBlock: string) => string;
}

const EXPLAINERS: ExplainerSpec[] = [
  {
    slug: "what-are-pfas-forever-chemicals",
    title: "What Are PFAS Forever Chemicals? A Plain-Language Guide",
    description:
      "PFAS are a class of more than 12,000 synthetic chemicals built around carbon-fluorine bonds that don't break down. Here's what they are, where they come from, and what the research says about how they affect human health.",
    category: "explainer",
    user: (chems) => `Write a 1100 to 1400 word evergreen explainer titled "What Are PFAS Forever Chemicals? A Plain-Language Guide" for CheckYourWater.

This article exists to be the single best, clearest, most factually accurate resource on the internet for someone who just heard the term "PFAS" or "forever chemicals" and typed it into Google. They are not a scientist. Treat them like an intelligent adult who deserves the full picture.

Use these EXACT H2 section headings:
## What PFAS actually are
## Where PFAS come from and why they're everywhere
## Why "forever chemicals"
## What the science says about health effects
## What the EPA has done so far
## What this means for your drinking water

Content guidance for each section:

What PFAS actually are
- PFAS stands for per- and polyfluoroalkyl substances.
- They are a class of more than 12,000 synthetic chemicals.
- They are defined by carbon-fluorine bonds, the strongest single bond in organic chemistry.
- That bond is the reason they don't break down in nature or in the human body.
- First synthesized by 3M and DuPont in the 1940s and 1950s.

Where PFAS come from and why they're everywhere
- Nonstick cookware (Teflon was the original PTFE coating).
- Stain-resistant carpet and upholstery (Scotchgard, Stainmaster).
- Waterproof and breathable outdoor gear (Gore-Tex used PFAS for decades).
- Grease-resistant food packaging (microwave popcorn bags, fast food wrappers, pizza boxes).
- Firefighting foam (AFFF), used at military bases and airports for decades.
- Industrial processes: chrome plating, semiconductor manufacturing, paper coatings.
- Cosmetics, dental floss, ski wax, even some pesticides.

Why "forever chemicals"
- The term was coined by chemistry professor Joe DeWitt.
- Carbon-fluorine bonds resist degradation by sunlight, microbes, heat, and water.
- Some PFAS have estimated environmental half-lives of thousands of years.
- Once ingested, they accumulate in the blood. PFOA has a human half-life of about 3 to 4 years.
- The CDC says more than 97 percent of Americans tested have measurable PFAS in their blood.

What the science says about health effects
- The EPA has determined there is no safe level of exposure to PFOA and PFOS for human health.
- The C8 Science Panel, created as part of the DuPont Parkersburg lawsuit, established probable links between PFOA exposure and: kidney cancer, testicular cancer, ulcerative colitis, thyroid disease, pregnancy-induced hypertension, and high cholesterol.
- More recent research has linked PFAS exposure to suppressed immune response (including reduced vaccine effectiveness in children), liver damage, lower birth weight, and developmental delays.
- Be honest about uncertainty: research on the broader 12,000+ class is ongoing.

What the EPA has done so far
- April 2024: the EPA set the first-ever enforceable federal drinking water standards for PFAS.
- The 6 regulated compounds and their MCLs: PFOA 4 ppt, PFOS 4 ppt, PFHxS 10 ppt, PFNA 10 ppt, HFPO-DA (GenX) 10 ppt. The 6th is a Hazard Index for mixtures.
- Public water systems have until 2027 to start monitoring and 2029 to install treatment if they exceed the limits.
- UCMR 5 (Unregulated Contaminant Monitoring Rule, 5th cycle) is the EPA testing program that gathered the data underlying CheckYourWater. Samples were collected 2023-2026.

What this means for your drinking water
- Most public water systems have not yet begun reporting PFAS in their annual Consumer Confidence Reports because compliance is not required until 2027.
- UCMR 5 is the most complete picture currently available. CheckYourWater shows that data for every monitored system.
- Link to our search: "Enter your zip code at [checkyourwater.org](https://checkyourwater.org) to see the PFAS testing results for the system that serves you."
- Link to /chemical for individual chemical pages.

REFERENCE DATA (the chemicals our database tracks):
${chems}

Output rules:
- 1100 to 1400 words.
- 8th grade reading level. Active voice.
- No em dashes. No "comprehensive", "robust", "crucial", "furthermore", "notably", "utilize", "leverage", "in order to".
- Cite the EPA, the CDC, and the C8 Science Panel by name where claims are theirs.
- Output ONLY the article body in markdown, starting with "## What PFAS actually are". No frontmatter. No title.`,
  },
  {
    slug: "how-to-filter-pfas-from-drinking-water",
    title: "How to Filter PFAS From Your Drinking Water: What Actually Works",
    description:
      "Three filtration technologies have been tested and certified to remove PFAS from drinking water. This is a brand-neutral guide to what they are, what they cost, and what to look for on the box.",
    category: "guide",
    user: () => `Write a 1100 to 1400 word evergreen guide titled "How to Filter PFAS From Your Drinking Water: What Actually Works" for CheckYourWater.

Critical: this article must NOT recommend specific brands or products. No affiliate links. No "we recommend" lines. The point is to be a brand-neutral, technically accurate explainer that journalists and public officials can trust. Pure information, zero commercial intent.

Use these EXACT H2 section headings:
## The three technologies that actually remove PFAS
## NSF certifications: what to look for on the box
## Pitcher and faucet filters
## Under-sink reverse osmosis
## Whole-house systems
## What does NOT work
## Quick cost comparison
## Before you buy: verify your specific PFAS

Content guidance for each section:

The three technologies that actually remove PFAS
- Granular activated carbon (GAC). The most common and affordable. Carbon traps PFAS molecules through adsorption.
- Reverse osmosis (RO). Pushes water through a semi-permeable membrane that physically blocks PFAS molecules.
- Ion exchange (IX) resin. A chemical exchange that swaps PFAS ions for harmless ones. Common in larger systems and some specialized home filters.

NSF certifications: what to look for on the box
- NSF/ANSI 53 is the certification for filters that reduce specific contaminants. Look for "PFOA/PFOS" listed in the contaminant claim.
- NSF/ANSI 58 is the certification for reverse osmosis systems. Look for "PFOA/PFOS" listed in the contaminant claim.
- NSF/ANSI 401 covers a separate list of "emerging compounds" but it does NOT specifically certify PFAS.
- NSF 42 covers taste and odor only. NSF 42 alone is NOT enough for PFAS reduction.
- The certification must list the specific PFAS the filter has been tested against. Some filters are certified for PFOA and PFOS but not for shorter-chain compounds like PFBS or GenX.

Pitcher and faucet filters
- Lowest cost entry point. Replaceable filters cost \\$30 to \\$60 per year for a typical household.
- Capacity ranges from 40 to 100 gallons per filter.
- Effective for treating drinking and cooking water if certified to NSF 53 for PFAS.
- Limitation: the user has to remember to replace the filter on schedule. Performance drops sharply once the filter is exhausted.

Under-sink reverse osmosis
- Higher upfront cost (\\$150 to \\$400 installed) but the most thorough PFAS removal at the household level.
- An RO system uses pre-filters, the membrane, and a post-filter. Annual filter replacement runs \\$50 to \\$100.
- Removes PFAS along with most other contaminants: lead, arsenic, nitrates, dissolved solids.
- Wastes 2 to 4 gallons of water for every gallon of treated water. Newer "tankless" systems are more efficient.
- Look for NSF/ANSI 58 certification with PFOA/PFOS in the claim.

Whole-house systems
- Treats every fixture in the house, not just the kitchen tap.
- Typical installed cost: \\$1,000 to \\$3,000 for a residential GAC system.
- When it makes sense: if your tap water is significantly contaminated AND you want filtered water from showers, washing machines, and ice makers. Note that bathing and showering exposure to PFAS is minimal because PFAS is not significantly absorbed through skin or inhaled from steam.
- For most households, an under-sink filter for drinking and cooking is the more cost-effective choice.

What does NOT work
- Boiling. Boiling concentrates PFAS, it doesn't remove them.
- Standard refrigerator filters or older pitcher filters without NSF 53 certification.
- Ultraviolet (UV) treatment. Kills bacteria, has no effect on PFAS.
- Standard water softeners.
- Distillation can work but is impractical for daily household use.

Quick cost comparison
A simple table or list:
- Pitcher filter: \\$25 to \\$45 upfront, \\$30 to \\$60 per year
- Faucet-mount: \\$20 to \\$50 upfront, \\$50 to \\$100 per year
- Under-sink RO: \\$150 to \\$400 installed, \\$50 to \\$100 per year
- Whole-house GAC: \\$1,000 to \\$3,000 installed, \\$100 to \\$300 per year

Before you buy: verify your specific PFAS
- Different filters are certified to remove different PFAS compounds. Check what's actually in YOUR water before buying.
- Look up your water system on [CheckYourWater](https://checkyourwater.org) or request your Consumer Confidence Report from your utility.
- Match the compounds detected in your water to the compounds the filter is certified to reduce.
- For shorter-chain PFAS (PFBS, PFBA, GenX), reverse osmosis is generally more reliable than activated carbon.

Output rules:
- 1100 to 1400 words.
- 8th grade reading level. Be honest about trade-offs.
- DO NOT recommend specific brands. DO NOT include affiliate links. No "best of" framing.
- No em dashes. No banned words.
- Output ONLY the article body in markdown, starting with "## The three technologies that actually remove PFAS". No frontmatter. No title.`,
  },
  {
    slug: "understanding-your-water-quality-report",
    title: "Understanding Your Water Quality Report: A Resident's Guide",
    description:
      "Every American on a public water system gets a Consumer Confidence Report once a year. Here's how to read one, what the numbers mean, and what your CCR is not telling you.",
    category: "guide",
    user: () => `Write a 1100 to 1400 word evergreen guide titled "Understanding Your Water Quality Report: A Resident's Guide" for CheckYourWater.

Use these EXACT H2 section headings:
## What a Consumer Confidence Report is and how to find yours
## The numbers and what they mean
## What your CCR tests for, and what it doesn't
## How UCMR 5 is different
## When "below detection limit" doesn't mean zero
## When to consider independent testing
## What to do with the information

Content guidance:

What a Consumer Confidence Report is and how to find yours
- Federal law (Safe Drinking Water Act, 1996 amendment) requires every community water system serving more than 25 people to deliver an annual Consumer Confidence Report (CCR) to its customers.
- It's typically mailed or emailed by July 1 each year, covering the prior calendar year of testing.
- If you can't find yours, the EPA maintains a CCR lookup at epa.gov/ccr. Most utilities also post current and historical CCRs on their website.
- If your water comes from a private well, you do not get a CCR. Well owners are responsible for their own testing.

The numbers and what they mean
- MCL (Maximum Contaminant Level): the legally enforceable upper limit a contaminant can reach in your tap water.
- MCLG (Maximum Contaminant Level Goal): a non-enforceable health-based target. For some contaminants like PFOA and PFOS, the MCLG is zero, meaning no level is considered safe.
- "Detected level" or "Highest Level Detected": the highest concentration measured in your water during the year.
- Range: the range of measurements across all samples.
- Units to know:
  - ppm (parts per million) = mg/L (milligrams per liter)
  - ppb (parts per billion) = ug/L (micrograms per liter)
  - ppt (parts per trillion) = ng/L (nanograms per liter)
- 1 ppt is one drop in 20 Olympic swimming pools. PFAS limits are measured in ppt because the chemicals are biologically active at extremely low levels.

What your CCR tests for, and what it doesn't
- Standard CCRs report on contaminants the EPA already regulates: lead, copper, disinfection byproducts, nitrates, microbes, radionuclides, and a few dozen others.
- Most current CCRs do NOT yet include PFAS. The April 2024 federal MCLs require monitoring to begin in 2027 and treatment compliance by 2029.
- That means a 2025 CCR can show "no violations" while still containing PFAS at levels above the new limits.
- Other contaminants that often go untested in standard CCRs: pharmaceuticals, microplastics, hexavalent chromium (chromium-6), and many of the 12,000+ PFAS compounds.

How UCMR 5 is different
- UCMR 5 (Unregulated Contaminant Monitoring Rule, 5th cycle) is a separate EPA testing program designed to gather data on contaminants that are not yet regulated, so the EPA can decide whether to regulate them in the future.
- UCMR 5 specifically tested for 29 PFAS compounds and lithium between 2023 and 2026.
- UCMR 5 results are public. They are the data that powers tools like CheckYourWater.
- UCMR 5 samples are collected at the entry point to the distribution system, before any household-level filtration.

When "below detection limit" doesn't mean zero
- Every test method has a Minimum Reporting Level (MRL): the lowest concentration the method can reliably measure.
- If your CCR or UCMR 5 result says "ND" or "<MRL", it means the contaminant was either truly absent OR present at a level lower than the lab could detect.
- For PFAS, the EPA's UCMR 5 MRLs range from about 1.8 ppt to 4.0 ppt depending on the compound.
- "ND" is good news but it is not the same as zero.

When to consider independent testing
- If your CCR shows detected PFAS, you don't need additional testing, you need a filter.
- If you're on a private well, especially within a few miles of a known PFAS source like a military base, airport, paper mill, or chrome plating facility, get tested.
- Certified PFAS panels from accredited labs run \\$200 to \\$400.
- The state environmental agency can sometimes test for free, especially in known contamination zones. Worth checking.

What to do with the information
- Read your CCR every year. It takes 10 minutes.
- If a contaminant exceeds an MCL, your utility is legally required to notify customers. Read those notices.
- Look up your system on [CheckYourWater](https://checkyourwater.org) for the UCMR 5 PFAS data your CCR doesn't include.
- Attend a city council or water board meeting if you're concerned. Public comment is usually open at the start of meetings.

Output rules:
- 1100 to 1400 words.
- 8th grade reading level.
- No em dashes. No banned words.
- Output ONLY the article body in markdown, starting with "## What a Consumer Confidence Report is and how to find yours". No frontmatter. No title.`,
  },
  {
    slug: "epa-pfas-standards-explained",
    title: "EPA PFAS Standards Explained: What the 2024 Drinking Water Limits Mean",
    description:
      "In April 2024 the EPA set the first-ever federal drinking water limits on six PFAS compounds. Here's what those limits are, how the Hazard Index works, and what happens to your utility if it exceeds them.",
    category: "explainer",
    user: () => `Write a 1100 to 1400 word evergreen explainer titled "EPA PFAS Standards Explained: What the 2024 Drinking Water Limits Mean" for CheckYourWater.

Use these EXACT H2 section headings:
## What the EPA actually set in April 2024
## The six regulated compounds and their limits
## How the Hazard Index works for mixtures
## When water systems have to comply
## What happens if a system exceeds the limits
## Where the rule stands now
## How CheckYourWater fits in

Content guidance:

What the EPA actually set in April 2024
- On April 10, 2024, the EPA finalized the first-ever enforceable federal drinking water standards for PFAS.
- The rule applies to all public water systems serving more than 25 people, about 66,000 systems nationwide.
- It is part of the Safe Drinking Water Act and was developed under the Biden administration's PFAS Strategic Roadmap.
- The rule was finalized after years of advocacy, scientific review, and public comment. It builds on years of growing evidence about PFAS health effects.
- Critically: the EPA set the Maximum Contaminant Level Goal (MCLG, the non-enforceable health target) for PFOA and PFOS at ZERO. This means the agency has determined there is no level of exposure considered safe.

The six regulated compounds and their limits
- PFOA (perfluorooctanoic acid): 4 parts per trillion (ppt). MCLG is zero.
- PFOS (perfluorooctanesulfonic acid): 4 ppt. MCLG is zero.
- PFHxS (perfluorohexanesulfonic acid): 10 ppt. MCLG is 10 ppt.
- PFNA (perfluorononanoic acid): 10 ppt. MCLG is 10 ppt.
- HFPO-DA (also called GenX, made by Chemours): 10 ppt. MCLG is 10 ppt.
- The 6th compound is actually a Hazard Index for mixtures (see next section).
- ppt means parts per trillion. To picture it: 1 ppt is one drop of water in roughly 20 Olympic-sized swimming pools.

How the Hazard Index works for mixtures
- PFAS rarely show up alone. Most contaminated water contains a mix of compounds.
- The Hazard Index is a way to regulate that mixture. It accounts for the fact that PFAS compounds can have additive health effects.
- The Hazard Index applies to four compounds: PFHxS, PFNA, HFPO-DA, and PFBS (PFBS does not have its own MCL but is part of the mix).
- For each compound, you divide its measured level by its Health-Based Water Concentration (HBWC).
- Then you add the four ratios together. If the sum is greater than 1.0, the system has exceeded the Hazard Index limit.
- The HBWC values: PFHxS 10 ppt, PFNA 10 ppt, HFPO-DA 10 ppt, PFBS 2,000 ppt.
- A simple example: water with 5 ppt PFHxS + 5 ppt HFPO-DA = (5/10) + (5/10) = 1.0. That's exactly at the limit.

When water systems have to comply
- 2027: water systems must complete initial monitoring for the 6 regulated PFAS compounds.
- 2029: systems that exceed any of the limits must have treatment in place to bring levels below the MCLs and must notify the public.
- The EPA explicitly designed the multi-year window so utilities have time to plan, fund, and install treatment.
- The rule also mandates ongoing public reporting. Once compliance starts, PFAS levels will appear in annual Consumer Confidence Reports.

What happens if a system exceeds the limits
- The utility must issue a public notice within 30 days describing the violation and the steps being taken.
- The utility must take action: install treatment (typically GAC, RO, or ion exchange), switch source water, or blend with cleaner sources.
- States with their own regulators (most states) handle enforcement. The EPA can step in if a state fails to act.
- Failure to comply can result in federal enforcement action and fines, but the more likely outcome is a consent order requiring a treatment plan on a specific timeline.

Where the rule stands now
- In 2025, several industry groups, including the American Water Works Association, sued the EPA seeking to overturn or modify parts of the rule, arguing that the cost-benefit analysis was flawed and the limits were too aggressive.
- Litigation is ongoing in the U.S. Court of Appeals for the D.C. Circuit.
- In 2025, the Trump administration's EPA cancelled hundreds of millions of dollars in grants that would have helped state and local water systems fund PFAS cleanup. Some of those cancellations are also being challenged in court.
- The April 2024 rule remains in effect during litigation. The 2027 monitoring deadline still applies.

How CheckYourWater fits in
- CheckYourWater shows EPA UCMR 5 results for every public water system that has been tested. UCMR 5 sampling ran 2023 to 2026.
- We grade each system A through F based on how its results compare to the April 2024 MCLs.
- A system that exceeds the MCLs in UCMR 5 is not yet in legal violation, because the compliance deadline is 2029. But the data is a strong indicator of what the system's CCR will look like once compliance reporting begins.
- Enter your zip code at [checkyourwater.org](https://checkyourwater.org) to see what's in the water serving you.

Output rules:
- 1100 to 1400 words.
- 8th grade reading level. Use precise numbers.
- No em dashes. No banned words.
- The Hazard Index section needs to be clear without being condescending. A simple worked example helps.
- Output ONLY the article body in markdown, starting with "## What the EPA actually set in April 2024". No frontmatter. No title.`,
  },
];

// ----- main pipeline ---------------------------------------------------------

interface ArticleManifest {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  category: string;
  city_slug?: string;
}

const TODAY = new Date().toISOString().slice(0, 10);
const AUTHOR = "CheckYourWater Research Team";

function buildFrontmatter(m: ArticleManifest): string {
  const lines = [
    "---",
    `title: "${m.title.replace(/"/g, '\\"')}"`,
    `slug: ${m.slug}`,
    `description: "${m.description.replace(/"/g, '\\"')}"`,
    `date: ${m.date}`,
    `last_updated: ${m.date}`,
    `author: "${m.author}"`,
    `category: ${m.category}`,
  ];
  if (m.city_slug) lines.push(`city_slug: ${m.city_slug}`);
  lines.push("---", "");
  return lines.join("\n");
}

const CITY_TITLES: Record<string, { title: string; description: string }> = {
  "parkersburg-wv": {
    title: "PFAS in Parkersburg, WV: What Water Tests Revealed About the Dark Waters City",
    description:
      "EPA testing of the Parkersburg Utility Board found PFOA at more than seven times the federal limit, decades after Rob Bilott's lawsuit forced DuPont to disclose what its Washington Works plant had done to the Ohio River. Here's what the data shows now.",
  },
  "calhoun-ga": {
    title: "PFAS in Calhoun, GA: What Water Tests Revealed in Georgia's Carpet Capital",
    description:
      "EPA testing of Calhoun's drinking water found PFOA at nearly four times the federal limit and PFOS at more than three times. The contamination traces back to decades of carpet treatment in the Dalton industrial corridor.",
  },
  "security-widefield-co": {
    title: "PFAS in Security-Widefield, CO: Military Base Contamination and Your Drinking Water",
    description:
      "EPA testing of the Widefield Water and Sanitation District shows three PFAS compounds above federal limits, including PFOS and PFHxS. The chemicals came from decades of firefighting foam use at Peterson Space Force Base.",
  },
  "parchment-mi": {
    title: "PFAS in Parchment, MI: What Water Tests Revealed in a Michigan Community",
    description:
      "After 1,587 ppt of PFAS in Parchment's water shut down its public wells in 2018, the city was connected to Kalamazoo's water system. EPA testing of that system now shows PFOS just above the federal limit and PFOA right at it.",
  },
  "merrimack-nh": {
    title: "PFAS in Merrimack, NH: Saint-Gobain Plant and Community Water Contamination",
    description:
      "Years of treatment investment have brought the Merrimack Village District's finished water within federal PFAS limits, after Saint-Gobain Performance Plastics contaminated wells across five New Hampshire towns. Here's what that recovery has cost.",
  },
  "newburgh-ny": {
    title: "PFAS in Newburgh, NY: Stewart Air National Guard Base and Washington Lake",
    description:
      "Newburgh has gone nearly a decade without its main drinking water source after PFOS from Stewart Air National Guard Base contaminated Washington Lake. Current EPA testing shows PFOA at the federal limit in the alternate supply.",
  },
};

async function generateCityArticle(slug: string, research: any) {
  const dataPath = path.join(BLOG_DATA_DIR, `${slug}.json`);
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8")) as CityDataFile;
  const meta = CITY_TITLES[slug];
  if (!meta) throw new Error(`No CITY_TITLES entry for ${slug}`);

  const { system, user } = buildCityPrompt(data, research[slug]);
  console.log(`  generating ${slug}...`);
  const raw = await callClaude(system, user);
  const { out, counts } = scrub(raw);
  const scrubReport = Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
  if (scrubReport) console.log(`    scrubbed: ${scrubReport}`);

  const fm = buildFrontmatter({
    slug,
    title: meta.title,
    description: meta.description,
    date: TODAY,
    author: AUTHOR,
    category: "city-investigation",
    city_slug: slug,
  });
  const filePath = path.join(OUT_DIR, `${slug}.mdx`);
  fs.writeFileSync(filePath, fm + out.trim() + "\n");
  console.log(`    wrote ${filePath} (${out.split(/\s+/).length} words)`);
}

async function generateExplainer(spec: ExplainerSpec, chemicalsBlock: string) {
  console.log(`  generating ${spec.slug}...`);
  const raw = await callClaude(SHARED_VOICE, spec.user(chemicalsBlock));
  const { out, counts } = scrub(raw);
  const scrubReport = Object.entries(counts)
    .map(([k, v]) => `${k}:${v}`)
    .join(" ");
  if (scrubReport) console.log(`    scrubbed: ${scrubReport}`);

  const fm = buildFrontmatter({
    slug: spec.slug,
    title: spec.title,
    description: spec.description,
    date: TODAY,
    author: AUTHOR,
    category: spec.category,
  });
  const filePath = path.join(OUT_DIR, `${spec.slug}.mdx`);
  fs.writeFileSync(filePath, fm + out.trim() + "\n");
  console.log(`    wrote ${filePath} (${out.split(/\s+/).length} words)`);
}

async function main() {
  const research = JSON.parse(
    fs.readFileSync(path.join(BLOG_DATA_DIR, "_research.json"), "utf8")
  );
  const chemicals = JSON.parse(
    fs.readFileSync(path.join(BLOG_DATA_DIR, "_chemicals.json"), "utf8")
  ) as Array<{
    compound_abbrev: string;
    compound_name: string;
    mcl_ppt: number | null;
  }>;
  const chemicalsBlock = chemicals
    .map(
      (c) =>
        `  - ${c.compound_abbrev}: ${c.compound_name}${c.mcl_ppt ? `, MCL ${c.mcl_ppt} ppt` : ""}`
    )
    .join("\n");

  const cityList = Object.keys(CITY_TITLES);

  console.log("=== City investigations ===");
  for (const slug of cityList) {
    if (ONLY && slug !== ONLY) continue;
    try {
      await generateCityArticle(slug, research);
    } catch (e) {
      console.error(`  FAILED ${slug}:`, e);
    }
  }

  console.log("=== Explainers ===");
  for (const spec of EXPLAINERS) {
    if (ONLY && spec.slug !== ONLY) continue;
    try {
      await generateExplainer(spec, chemicalsBlock);
    } catch (e) {
      console.error(`  FAILED ${spec.slug}:`, e);
    }
  }

  console.log(
    `\nDone. Token usage: ${totalIn} in / ${totalOut} out (Sonnet pricing applies)`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
