/**
 * Mission 12: seed the news_items table with 20 real PFAS news stories
 * curated from the Jan-Apr 2026 window. Each item was collected via web
 * search and the source URL was returned by a live search result.
 *
 * Run: npx tsx scripts/seed-news.ts
 *
 * This script is idempotent. It upserts by URL so re-running will update
 * the title/summary/category for an existing row without creating a
 * duplicate.
 */
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type NewsCategory =
  | "epa-action"
  | "state-regulation"
  | "legal"
  | "research"
  | "local-coverage"
  | "industry";

interface SeedItem {
  title: string;
  url: string;
  source_name: string;
  summary: string;
  category: NewsCategory;
  published_date: string;
  featured?: boolean;
  city_slug?: string | null;
  state?: string | null;
}

const ITEMS: SeedItem[] = [
  {
    title:
      "EPA and HHS say they will target forever chemicals in tap water, but new rules may be years away",
    url: "https://www.cnn.com/2026/04/02/health/epa-hhs-tap-water-contaminants-wellness",
    source_name: "CNN",
    summary:
      "EPA and the Department of Health and Human Services announced a joint plan to address PFAS, microplastics, and pharmaceuticals in drinking water. The agency said it would add these pollutants to the next Contaminant Candidate List, but the list is not expected to be signed until November and binding limits could take years after that.",
    category: "epa-action",
    published_date: "2026-04-02",
    featured: true,
    state: null,
    city_slug: null,
  },
  {
    title:
      "DC Circuit denies EPA motion to vacate Hazard Index PFAS from the drinking water rule",
    url: "https://www.asdwa.org/2026/01/22/dc-court-denies-epas-motion-to-vacate-hazard-index-pfas-from-drinking-water-rule/",
    source_name: "ASDWA",
    summary:
      "A federal appeals court rejected EPA's request to throw out federal limits for PFHxS, PFNA, GenX, and PFBS while the agency rewrites the rule. The judges said the agency had not shown a strong enough case for summary action. The 2024 limits stay in place for now and the court set a briefing schedule ending March 6.",
    category: "legal",
    published_date: "2026-01-22",
    state: null,
    city_slug: null,
  },
  {
    title:
      "Wisconsin Natural Resources Board approves updated PFAS drinking water standards",
    url: "https://www.wsaw.com/2026/01/28/wisconsin-natural-resources-board-approves-updated-pfas-drinking-water-standards/",
    source_name: "WSAW",
    summary:
      "Wisconsin's Natural Resources Board voted to tighten the state's PFAS drinking water limits and aligned them with the 2024 federal rule. The new standards set enforceable limits of 4 parts per trillion for PFOA and PFOS and 10 parts per trillion for three other compounds. The rule was sent to the governor and legislature for final approval.",
    category: "state-regulation",
    published_date: "2026-01-28",
    state: "WI",
    city_slug: null,
  },
  {
    title:
      "Governor Evers approves Wisconsin PFAS drinking water limits that match federal rule",
    url: "https://www.wxpr.org/energy-environment/2026-03-02/changes-to-drinking-water-standards-for-pfas-approved-for-wisconsin",
    source_name: "WXPR",
    summary:
      "Governor Tony Evers signed off on new Wisconsin rules that lower the PFAS drinking water standard from 70 parts per trillion to 4 parts per trillion for PFOA and PFOS. The limits only apply to public water systems, not private wells. Wisconsin becomes one of the first states to lock in the full federal limits even as EPA tries to weaken them.",
    category: "state-regulation",
    published_date: "2026-03-02",
    state: "WI",
    city_slug: null,
  },
  {
    title:
      "Saint-Gobain to pay $1.71 million to connect contaminated homes in Londonderry to public water",
    url: "https://www.concordmonitor.com/2026/03/31/saint-gobain-pfas-agreement-londonderry-merrimack/",
    source_name: "Concord Monitor",
    summary:
      "The New Hampshire attorney general reached an agreement with Saint-Gobain requiring the company to pay $1.71 million toward extending a water main to about 350 homes with PFAS-contaminated wells in Londonderry. The deal is the latest in a long line of settlements tied to PFAS from the company's former Merrimack plant. The town will still carry the long-term cost of maintaining the new water line.",
    category: "legal",
    published_date: "2026-03-31",
    city_slug: "merrimack-nh",
    state: "NH",
  },
  {
    title:
      "Saint-Gobain agrees to fund PFAS project in Londonderry, but the town faces long-term costs",
    url: "https://www.nhpr.org/nh-news/2026-03-31/saint-gobain-pfas-londonderry-remediation-water",
    source_name: "New Hampshire Public Radio",
    summary:
      "Residents near the former Saint-Gobain Merrimack plant welcomed news that about 350 homes in Londonderry will finally get clean public water. But town officials warned that the $1.71 million payment only covers construction of the water main. Londonderry will pay to operate and maintain the system for decades to come.",
    category: "local-coverage",
    published_date: "2026-03-31",
    city_slug: "merrimack-nh",
    state: "NH",
  },
  {
    title:
      "Proposed location for ICE facility in Merrimack sits within PFAS contamination zone",
    url: "https://www.nhpr.org/nh-news/2026-02-20/ice-facility-merrimack-detention-center-nh-newhampshire-pfas-contamination-drinking-water",
    source_name: "New Hampshire Public Radio",
    summary:
      "A proposed federal immigration detention center in Merrimack would be built on land inside the groundwater contamination zone from the old Saint-Gobain plant. Local activists say the site's history of PFAS pollution raises questions about drinking water for future detainees and staff. State regulators have not said how the facility would be served with clean water.",
    category: "local-coverage",
    published_date: "2026-02-20",
    city_slug: "merrimack-nh",
    state: "NH",
  },
  {
    title:
      "Bill to shield Georgia carpet companies from PFAS lawsuits advances",
    url: "https://www.ajc.com/news/2026/02/bill-to-shield-georgia-carpet-companies-from-pfas-lawsuits-advances/",
    source_name: "Atlanta Journal-Constitution",
    summary:
      "A Georgia legislative committee advanced a bill that would limit lawsuits residents can bring against carpet makers over PFAS contamination. Supporters say the bill protects the Dalton-area carpet industry from what they call open-ended liability. Opponents, including residents of Calhoun whose water was contaminated, say the bill would cut off the main legal tool people use to hold polluters accountable.",
    category: "state-regulation",
    published_date: "2026-02-12",
    city_slug: "calhoun-ga",
    state: "GA",
  },
  {
    title:
      "New research links health impacts from forever chemicals to billions in economic losses",
    url: "https://news.arizona.edu/news/new-research-links-health-impacts-related-forever-chemicals-billions-economic-losses",
    source_name: "University of Arizona News",
    summary:
      "A University of Arizona-led study estimates that health effects from PFAS in drinking water cost the United States at least $8 billion a year in social costs. The researchers tied the losses to infant deaths, low birth weight, and premature birth. The paper adds new economic weight to arguments for keeping and enforcing federal PFAS limits.",
    category: "research",
    published_date: "2026-02-18",
    state: null,
    city_slug: null,
  },
  {
    title:
      "Yale study finds forever chemicals promote cancer cell migration in the lab",
    url: "https://ysph.yale.edu/news-article/yale-study-forever-chemicals-promote-cancer-cell-migration/",
    source_name: "Yale School of Public Health",
    summary:
      "Researchers at Yale found that two common PFAS chemicals caused cancer cells in the lab to move more than untreated cells. Increased movement is one of the early signs that a tumor may spread. The authors said the results are lab evidence only, but add to a growing body of research linking PFAS exposure to more aggressive disease.",
    category: "research",
    published_date: "2026-03-05",
    state: null,
    city_slug: null,
  },
  {
    title:
      "Forever chemicals may triple the risk of fatty liver disease in adolescents",
    url: "https://www.hawaii.edu/news/2026/01/06/forever-chemicals-in-adolescents/",
    source_name: "University of Hawaii News",
    summary:
      "A University of Hawaii study of Southern California teenagers found that those with higher PFAS levels in their blood were up to three times more likely to show signs of fatty liver disease. Fatty liver disease used to be rare in teenagers and is now rising sharply. The authors say drinking water and food are the most likely sources of exposure.",
    category: "research",
    published_date: "2026-01-06",
    state: null,
    city_slug: null,
  },
  {
    title:
      "Study estimates PFAS in drinking water contribute to about 6,864 cancer cases per year",
    url: "https://www.waterdiplomat.org/story/2026/03/cost-forever-chemicals-estimating-annual-cancer-burden-attributable-pfas-us-water",
    source_name: "The Water Diplomat",
    summary:
      "A new nationwide analysis tied PFAS in public drinking water to roughly 6,864 cancer cases each year in the United States. The researchers linked specific compounds to kidney, testicular, and prostate cancers. They argue that the cost of treatment and lost productivity far exceeds what it would take for utilities to install filters.",
    category: "research",
    published_date: "2026-03-15",
    state: null,
    city_slug: null,
  },
  {
    title:
      "New data show 176 million people exposed to forever chemicals as Trump EPA rolls back protections",
    url: "https://www.ewg.org/news-insights/news-release/2026/03/new-data-shows-176m-exposed-forever-chemicals-trump-epa-rolls",
    source_name: "Environmental Working Group",
    summary:
      "EWG's new analysis of EPA testing data shows that about 176 million people drink water with detectable PFAS. The report comes as the EPA moves to loosen limits for several PFAS compounds and delay compliance deadlines for utilities until 2031. EWG argues the scale of exposure makes weaker rules indefensible.",
    category: "epa-action",
    published_date: "2026-03-18",
    state: null,
    city_slug: null,
  },
  {
    title:
      "Fayetteville utility approves $133.7 million contract to filter PFAS from drinking water",
    url: "https://www.cityviewnc.com/stories/pwc-oks-133-7-million-project-to-filter-forever-chemicals-from-water/",
    source_name: "CityView",
    summary:
      "The Fayetteville Public Works Commission approved a $133.7 million contract to install granular activated carbon filters at its two drinking water plants. The filters are designed to remove PFAS compounds that have reached residents downstream of the Chemours Fayetteville Works plant. Construction is expected to finish by 2029, before the federal compliance deadline.",
    category: "local-coverage",
    published_date: "2026-02-25",
    state: "NC",
    city_slug: null,
  },
  {
    title:
      "PFAS, microplastics and what comes next for North Carolina's water",
    url: "https://www.northcarolinahealthnews.org/2026/01/07/pfas-microplastics-and-what-comes-next-for-north-carolinas-water/",
    source_name: "North Carolina Health News",
    summary:
      "North Carolina water regulators are weighing new limits on PFAS and 1,4-dioxane discharges into rivers that feed downstream utilities. State officials said the plan is a response to a decade of PFAS pollution from the Chemours plant in Fayetteville. Environmental groups say the draft lacks real enforcement teeth.",
    category: "local-coverage",
    published_date: "2026-01-07",
    state: "NC",
    city_slug: null,
  },
  {
    title:
      "Small North Carolina water systems warn they cannot afford PFAS treatment",
    url: "https://www.northcarolinahealthnews.org/2026/04/02/rising-costs-small-water-systems-north-carolina/",
    source_name: "North Carolina Health News",
    summary:
      "A new study finds that small water utilities in North Carolina are facing rising costs to comply with PFAS limits, and some say they cannot pay for treatment without raising rates sharply. Operators worry that the 2031 federal deadline is too short for systems that serve a few thousand customers. State lawmakers are weighing whether to help with grants from the 3M settlement funds.",
    category: "local-coverage",
    published_date: "2026-04-02",
    featured: true,
    state: "NC",
    city_slug: null,
  },
  {
    title:
      "North Carolina pushes back as EPA moves to scale back PFAS reporting",
    url: "https://www.wral.com/news/state/north-carolina-challenges-epa-pfas-reporting-january-2026/",
    source_name: "WRAL",
    summary:
      "North Carolina joined a dozen other states in opposing an EPA proposal that would narrow which companies have to report PFAS releases. The state argued the change would hide pollution from communities already dealing with contamination. Attorney General Jeff Jackson said the reporting rule is one of the few tools residents have to track where PFAS is coming from.",
    category: "epa-action",
    published_date: "2026-01-15",
    state: "NC",
    city_slug: null,
  },
  {
    title:
      "Congress debates chemical safety law as North Carolina's PFAS crisis offers a warning",
    url: "https://www.northcarolinahealthnews.org/2026/02/09/congress-tsca-pfas-north-carolina/",
    source_name: "North Carolina Health News",
    summary:
      "A House bill would weaken how states can regulate chemicals under the Toxic Substances Control Act. Public health advocates point to North Carolina's decade-long fight with Chemours over PFAS in the Cape Fear River as proof that federal enforcement has not been enough. Supporters of the bill say current state rules create a patchwork for industry.",
    category: "epa-action",
    published_date: "2026-02-09",
    state: "NC",
    city_slug: null,
  },
  {
    title:
      "3M promised to phase out PFAS by the end of 2025, but thousands of products still contain them",
    url: "https://chemsec.org/3m-promised-to-phase-out-pfas-how-has-it-turned-out/",
    source_name: "ChemSec",
    summary:
      "3M said in its March annual report that it has exited PFAS manufacturing as promised. But an analysis of the company's own disclosures shows that thousands of 3M products still contain PFAS that comes from outside suppliers. Only about a third of its PFAS-containing product lines have been fully reformulated.",
    category: "industry",
    published_date: "2026-03-20",
    state: null,
    city_slug: null,
  },
  {
    title: "Revisiting Maine and Minnesota's sweeping PFAS product laws",
    url: "https://pfas.pillsburylaw.com/amp/revisiting-maine-minnesota-pfas-laws/",
    source_name: "PFAS Observer",
    summary:
      "New state bans on PFAS in consumer products took effect January 1 in Maine, Minnesota, Vermont, Colorado, Connecticut, and Washington. Maine's expanded law covers cookware, cosmetics, cleaning products, furniture, and textiles. Minnesota launched a new reporting system that requires manufacturers to disclose PFAS in any product sold in the state by July.",
    category: "state-regulation",
    published_date: "2026-01-06",
    state: null,
    city_slug: null,
  },
];

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing from .env.local");
  }

  // Make sure the table exists. If not, instruct the user.
  const probe = await sb.from("news_items").select("id").limit(1);
  if (probe.error) {
    console.error(
      `\nnews_items table is not reachable: ${probe.error.message}\n` +
        "Apply scripts/mission-12-migration.sql in the Supabase SQL editor first:\n" +
        "  https://supabase.com/dashboard/project/_/sql\n"
    );
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const item of ITEMS) {
    // Upsert by URL. We use a manual check-then-insert/update because
    // Supabase upsert on a non-unique column is awkward.
    const { data: existing } = await sb
      .from("news_items")
      .select("id")
      .eq("url", item.url)
      .maybeSingle();

    const row = {
      title: item.title,
      url: item.url,
      source_name: item.source_name,
      summary: item.summary,
      category: item.category,
      published_date: item.published_date,
      featured: item.featured ?? false,
      city_slug: item.city_slug ?? null,
      state: item.state ?? null,
      status: "published" as const,
    };

    if (existing?.id) {
      const { error } = await sb
        .from("news_items")
        .update(row)
        .eq("id", existing.id);
      if (error) throw error;
      updated++;
    } else {
      const { error } = await sb.from("news_items").insert(row);
      if (error) throw error;
      inserted++;
    }
    console.log(`  ${item.category.padEnd(16)} ${item.published_date} ${item.title.slice(0, 80)}`);
  }

  console.log(`\nSeeded ${ITEMS.length} news items (${inserted} new, ${updated} updated).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
