/**
 * Interactive curation tool for adding one news item to news_items.
 *
 *   npx tsx scripts/curate-news.ts <url>
 *
 * Steps:
 *   1. Fetch the page at <url> and extract readable text
 *   2. Ask Claude for a plain-language title and a 2-3 sentence summary
 *   3. Prompt the user to pick a category (and optional city/state)
 *   4. Insert the row into news_items
 *
 * This is the tool for ongoing manual curation. It does NOT publish
 * anything automatically: the user reviews and accepts each field.
 */
import * as path from "path";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const CATEGORIES = [
  "epa-action",
  "state-regulation",
  "legal",
  "research",
  "local-coverage",
  "industry",
] as const;
type NewsCategory = (typeof CATEGORIES)[number];

const BANNED_WORDS = [
  "comprehensive",
  "robust",
  "crucial",
  "leverage",
  "utilize",
  "underscore",
  "unprecedented",
  "delve",
  "moreover",
  "furthermore",
];

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchArticle(url: string): Promise<{
  title: string;
  text: string;
  source: string;
}> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "CheckYourWater/1.0 (+https://checkyourwater.org) news curator",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const html = await res.text();

  const titleMatch =
    html.match(/<meta property="og:title" content="([^"]+)"/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const siteMatch =
    html.match(/<meta property="og:site_name" content="([^"]+)"/i) ||
    [null, new URL(url).host.replace(/^www\./, "")];

  const body = stripTags(html).slice(0, 8000);
  return {
    title: titleMatch?.[1]?.trim() ?? "",
    source: siteMatch?.[1] ?? new URL(url).host,
    text: body,
  };
}

async function askClaude(
  article: { title: string; text: string; source: string },
  url: string
): Promise<{ title: string; summary: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn(
      "[curate] ANTHROPIC_API_KEY not set. Falling back to the article's own title and an empty summary."
    );
    return { title: article.title, summary: "" };
  }

  const system = [
    "You are a news editor for checkyourwater.org. You write short, plain",
    "summaries of PFAS (forever chemicals) news for a general audience at",
    "an 8th grade reading level.",
    "",
    "Rules for the summary:",
    "  - 2 to 3 sentences.",
    "  - Factual and concrete. No editorializing.",
    "  - Do NOT use em dashes.",
    `  - Do NOT use these words: ${BANNED_WORDS.join(", ")}.`,
    "  - Add at least one piece of context the headline does not give.",
    "",
    "Return only JSON of the form:",
    '  { "title": "...", "summary": "..." }',
  ].join("\n");

  const user = [
    `URL: ${url}`,
    `Source: ${article.source}`,
    `Original title: ${article.title}`,
    "",
    "Article text:",
    article.text,
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API error ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content.find((c) => c.type === "text")?.text?.trim() ?? "";

  // Strip any ``` fencing.
  const clean = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(clean) as { title: string; summary: string };
    return { title: parsed.title, summary: parsed.summary };
  } catch {
    throw new Error(`Could not parse Claude response as JSON:\n${text}`);
  }
}

function validateCleanText(s: string): string | null {
  if (/[—–]/.test(s)) return "contains em/en dash";
  const lower = s.toLowerCase();
  for (const w of BANNED_WORDS) {
    if (lower.includes(w)) return `contains banned word: ${w}`;
  }
  return null;
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("usage: npx tsx scripts/curate-news.ts <url>");
    process.exit(1);
  }

  const rl = readline.createInterface({ input, output });
  const ask = (q: string, def?: string) =>
    rl.question(def ? `${q} [${def}] ` : `${q} `);

  console.log(`\nFetching ${url}...`);
  const article = await fetchArticle(url);
  console.log(`Source: ${article.source}`);
  console.log(`Title:  ${article.title}`);

  console.log("\nAsking Claude for a summary...");
  const drafted = await askClaude(article, url);

  console.log("\n--- Draft ---");
  console.log("Title:  ", drafted.title);
  console.log("Summary:", drafted.summary);

  const dashError = validateCleanText(
    `${drafted.title}\n${drafted.summary}`
  );
  if (dashError) {
    console.warn(`\n[!] ${dashError}. Edit below.`);
  }

  const title = (await ask("\nTitle", drafted.title)) || drafted.title;
  const summary =
    (await ask("Summary", drafted.summary)) || drafted.summary;

  console.log("\nCategories:");
  CATEGORIES.forEach((c, i) => console.log(`  ${i + 1}. ${c}`));
  const catAnswer = await ask("Pick a category (1-6)");
  const catIndex = Math.max(1, Math.min(6, parseInt(catAnswer, 10) || 1)) - 1;
  const category: NewsCategory = CATEGORIES[catIndex];

  const sourceName = (await ask("Source name", article.source)) || article.source;
  const publishedDate =
    (await ask("Published date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10))) ||
    new Date().toISOString().slice(0, 10);
  const citySlugInput = (await ask("city_slug (or blank)", "")).trim();
  const stateInput = (await ask("state code (or blank)", "")).trim();
  const featuredInput = (await ask("featured? (y/N)", "N")).trim().toLowerCase();

  rl.close();

  const finalError = validateCleanText(`${title}\n${summary}`);
  if (finalError) {
    console.error(`\n[!] Refused to insert: ${finalError}`);
    process.exit(1);
  }

  const row = {
    title: title.trim(),
    url,
    source_name: sourceName.trim(),
    summary: summary.trim(),
    category,
    published_date: publishedDate,
    city_slug: citySlugInput || null,
    state: stateInput ? stateInput.toUpperCase() : null,
    featured: featuredInput === "y" || featuredInput === "yes",
    status: "published" as const,
  };

  const { error } = await sb.from("news_items").insert(row);
  if (error) {
    console.error("insert error:", error.message);
    process.exit(1);
  }
  console.log(`\nInserted: ${row.title}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
