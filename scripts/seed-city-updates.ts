/**
 * Mission 15: seed the city_updates table with verified "What Happened Next"
 * entries for the launch cities. Every entry below was confirmed via a live
 * web search; the source_url is the live result that supports the summary.
 *
 * Run: npx tsx scripts/seed-city-updates.ts
 *
 * The script is idempotent: it deletes existing rows for each seeded
 * city_slug before re-inserting, so re-running it will not create duplicates.
 */
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

type Category =
  | "government-action"
  | "utility-response"
  | "legal"
  | "community-action"
  | "media-coverage";

interface SeedUpdate {
  city_slug: string;
  update_date: string;
  title: string;
  description: string;
  source_url: string;
  source_name: string;
  category: Category;
}

const SEEDS: SeedUpdate[] = [
  // ----- Parkersburg, WV -----
  {
    city_slug: "parkersburg-wv",
    update_date: "2024-08-01",
    title: "EPA orders Chemours to address PFAS in Parkersburg discharge",
    description:
      "The EPA ordered Chemours to take new steps to control PFAS pollution from its Washington Works plant, which has been discharging forever chemicals into the Ohio River in violation of permit limits since 2019.",
    source_url:
      "https://wvpublic.org/epa-orders-chemours-to-address-pfas-in-parkersburg-water-discharge/",
    source_name: "West Virginia Public Broadcasting",
    category: "government-action",
  },
  {
    city_slug: "parkersburg-wv",
    update_date: "2025-05-07",
    title: "Trump EPA cancels grant funding to address WV PFAS contamination",
    description:
      "West Virginia regulators' work to reduce PFAS in the state's drinking water stalled after the federal government canceled a $1 million grant that supported community-level action in affected systems including Parkersburg-area utilities.",
    source_url:
      "https://mountainstatespotlight.org/2025/05/07/trump-epa-pfas-canceled-grant/",
    source_name: "Mountain State Spotlight",
    category: "government-action",
  },
  {
    city_slug: "parkersburg-wv",
    update_date: "2025-05-30",
    title: "WV Rivers asks federal judge to halt Chemours PFAS violations",
    description:
      "WV Rivers Coalition filed a motion asking a federal judge to order Chemours to temporarily stop discharging PFAS at levels above its permit limit while the underlying case proceeds.",
    source_url:
      "https://mountainstatespotlight.org/2025/05/30/chemours-pfas-pollution-ohio-river-lawsuit/",
    source_name: "Mountain State Spotlight",
    category: "legal",
  },

  // ----- Merrimack, NH -----
  {
    city_slug: "merrimack-nh",
    update_date: "2024-09-30",
    title: "Merrimack seeks fair share of Saint-Gobain settlement funds",
    description:
      "Town leaders publicly pressed the state for a meaningful portion of incoming PFAS settlement money, citing the more than $14.5 million Merrimack Village District has spent on activated carbon treatment for four contaminated wells.",
    source_url:
      "https://newhampshirebulletin.com/2024/09/30/forever-chemicals-have-cost-merrimack-millions-now-leaders-seek-fair-share-of-settlement-funds/",
    source_name: "New Hampshire Bulletin",
    category: "community-action",
  },
  {
    city_slug: "merrimack-nh",
    update_date: "2024-12-13",
    title: "Demolition begins at Saint-Gobain Merrimack plant",
    description:
      "Saint-Gobain began tearing down its Merrimack facility, the source of decades of PFAS contamination in town wells, while the long-term remediation plan for the site remained undecided.",
    source_url:
      "https://www.nhpr.org/nh-news/2024-12-13/saint-gobain-is-demolishing-its-facility-in-merrimack-but-what-will-happen-to-lingering-contamination",
    source_name: "New Hampshire Public Radio",
    category: "utility-response",
  },
  {
    city_slug: "merrimack-nh",
    update_date: "2025-11-20",
    title: "NH lays out plan to distribute $45 million in PFAS settlement funds",
    description:
      "The New Hampshire Department of Environmental Services announced its plan to distribute an initial $45 million in PFAS settlement money across affected public water supplies, with Merrimack expected to be a major recipient.",
    source_url:
      "https://newhampshirebulletin.com/2025/11/20/funds-from-pfas-settlements-are-coming-to-new-hampshire-how-will-they-reach-affected-towns/",
    source_name: "New Hampshire Bulletin",
    category: "government-action",
  },

  // ----- Parchment, MI -----
  {
    city_slug: "parchment-mi",
    update_date: "2024-05-13",
    title: "Kalamazoo proposes $51 million plan to filter PFAS",
    description:
      "Kalamazoo, the city that supplies drinking water to Parchment after the 2018 contamination crisis, proposed a $51 million treatment plant designed to remove iron, manganese, and PFAS from groundwater.",
    source_url:
      "https://www.michiganpublic.org/environment-climate-change/2024-05-13/kalamazoo-proposes-51-million-plan-to-filter-pfas",
    source_name: "Michigan Public Radio",
    category: "utility-response",
  },
  {
    city_slug: "parchment-mi",
    update_date: "2025-09-05",
    title: "Kalamazoo set to break ground on new PFAS treatment plant",
    description:
      "Construction on the Eastside Water Treatment plant is scheduled to begin September 8, 2025, and run through November 2028. The 15,000-square-foot facility will treat groundwater serving Parchment and surrounding communities for PFAS, iron, and manganese.",
    source_url:
      "https://www.wmuk.org/wmuk-news/2025-09-05/kalamazoo-is-about-to-begin-work-on-a-new-water-plant-to-improve-quality-and-guard-against-pfas",
    source_name: "WMUK",
    category: "utility-response",
  },

  // ----- Security-Widefield, CO -----
  {
    city_slug: "security-widefield-co",
    update_date: "2024-09-15",
    title: "Air Force funds $9 million PFAS treatment upgrade in Fountain",
    description:
      "The U.S. Air Force agreed to pay $9 million toward cutting-edge water treatment in the Fountain area, near Security-Widefield, after PFAS contamination from firefighting foam used at the former Peterson Air Force Base.",
    source_url:
      "https://www.cbsnews.com/colorado/news/air-force-pays-9-million-water-treatment-fountain-pfas-contamination/",
    source_name: "CBS Colorado",
    category: "government-action",
  },
  {
    city_slug: "security-widefield-co",
    update_date: "2025-03-31",
    title: "DoD updates cleanup status for Peterson Space Force Base",
    description:
      "As of March 2025, the Department of Defense reported it has completed preliminary assessment and site inspection at 703 installations nationwide. The former Peterson Air Force Base, source of PFAS contamination in Security-Widefield, remains in the active cleanup pipeline.",
    source_url: "https://www.acq.osd.mil/eie/eer/ecc/pfas/data/cleanup-pfas.html",
    source_name: "U.S. Department of Defense",
    category: "government-action",
  },

  // ----- Newburgh, NY -----
  {
    city_slug: "newburgh-ny",
    update_date: "2024-06-01",
    title: "GAC treatment system continues filtering Washington Lake water",
    description:
      "The granular activated carbon treatment system installed by New York State at Washington Lake continues to filter PFAS out of Newburgh's primary drinking water source. State testing has shown the system to be effective for both long-chain PFOA and PFOS.",
    source_url: "https://dec.ny.gov/environmental-protection/site-cleanup/regional-remediation-project-information/region-3/newburgh",
    source_name: "NYS Department of Environmental Conservation",
    category: "utility-response",
  },
  {
    city_slug: "newburgh-ny",
    update_date: "2024-10-15",
    title: "City officials raise concerns about short-chain PFAS removal",
    description:
      "Newburgh city officials and residents continue to raise concerns about whether the existing GAC filtration system can effectively remove short-chain PFAS, even as state officials maintain it can handle both short- and long-chain compounds.",
    source_url: "https://wamc.org/post/newburgh-city-officials-still-have-concerns-about-filtration-system",
    source_name: "WAMC",
    category: "community-action",
  },

  // ----- Calhoun, GA -----
  {
    city_slug: "calhoun-ga",
    update_date: "2024-07-01",
    title: "Calhoun settles Coosa River Basin Initiative PFAS lawsuit",
    description:
      "The City of Calhoun agreed to a settlement with the Coosa River Basin Initiative requiring the city to install new filtration and treatment technology at its two drinking water plants, test private wells, and hire a third-party monitor to oversee compliance.",
    source_url:
      "https://www.ajc.com/news/business/calhoun-reaches-settlement-in-forever-chemicals-lawsuit/UPIWMW334RAULOVHIPPOBS2BKE/",
    source_name: "Atlanta Journal-Constitution",
    category: "legal",
  },
  {
    city_slug: "calhoun-ga",
    update_date: "2024-12-01",
    title: "Mohawk Industries sues chemical companies over PFAS exposure",
    description:
      "Calhoun-based Mohawk Industries filed suit in Whitfield County Superior Court against 3M, DuPont, Daikin America, and Chemours, alleging the companies concealed the risks of PFAS in carpet stain-resistance products. Mohawk says it has already paid more than $100 million toward water treatment in affected communities.",
    source_url: "https://www.wrganews.com/2024/12/01/mohawk-files-pfas-suit-against-chemical-companies/",
    source_name: "WRGA",
    category: "legal",
  },
  {
    city_slug: "calhoun-ga",
    update_date: "2025-11-13",
    title: "3M files counter-suit blaming carpet makers for north Georgia PFAS",
    description:
      "Chemical giant 3M responded to the wave of north Georgia PFAS litigation by blaming carpet manufacturers, including those clustered around Calhoun, for the contamination of local drinking water supplies.",
    source_url: "https://www.atlantanewsfirst.com/2025/11/13/chemical-giant-blames-carpet-makers-north-georgia-pfas-contamination/",
    source_name: "Atlanta News First",
    category: "legal",
  },
];

async function main(): Promise<void> {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const slugs = Array.from(new Set(SEEDS.map((s) => s.city_slug)));
  console.log(`Clearing existing city_updates for ${slugs.length} cities...`);
  const { error: deleteErr } = await sb
    .from("city_updates")
    .delete()
    .in("city_slug", slugs);
  if (deleteErr) {
    console.error("Delete failed:", deleteErr.message);
    process.exit(1);
  }

  console.log(`Inserting ${SEEDS.length} city_updates...`);
  const { error: insertErr } = await sb.from("city_updates").insert(SEEDS);
  if (insertErr) {
    console.error("Insert failed:", insertErr.message);
    process.exit(1);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
