/**
 * /chemical/[slug] — one page per PFAS compound.
 *
 * Slugs are always lowercase (e.g. /chemical/pfoa, /chemical/hfpo-da). The
 * chemicals table stores compound_abbrev with original casing/punctuation
 * (PFOA, HFPO-DA, 11Cl-PF3OUdS), so we slugify on both ends.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AiDisclaimer from "@/components/AiDisclaimer";
import { supabasePublic } from "@/lib/supabase";
import { formatNumber, formatPPT } from "@/lib/format";

export const revalidate = 86400;
export const dynamicParams = true;

type Params = { slug: string };

interface ChemicalRow {
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  chemical_formula: string | null;
  mcl_ppt: number | null;
  mcl_status: string | null;
  chain_length: string | null;
  pubchem_cid: number | null;
  structure_image_url: string | null;
}

/** Slugify a compound abbreviation: lowercase, hyphenate non-alphanumerics. */
function slugify(abbrev: string): string {
  return abbrev.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function loadChemical(slug: string): Promise<{
  chem: ChemicalRow;
  body: string | null;
  detectedSystems: number;
  exceedingSystems: number;
} | null> {
  // Slug match: load all compound_abbrevs and find one whose slug matches.
  const { data: all } = await supabasePublic
    .from("chemicals")
    .select(
      "compound_abbrev, compound_name, cas_number, chemical_formula, mcl_ppt, mcl_status, chain_length, pubchem_cid, structure_image_url"
    );
  const chem = (all ?? []).find(
    (c) => slugify(c.compound_abbrev as string) === slug
  ) as ChemicalRow | undefined;
  if (!chem) return null;

  // AI explainer (key is the compound_abbrev, not the slug)
  const { data: contentRow } = await supabasePublic
    .from("content")
    .select("body")
    .eq("content_type", "chemical_explainer")
    .eq("reference_key", chem.compound_abbrev)
    .maybeSingle();

  // National detection counts.
  const { count: detectedSystems } = await supabasePublic
    .from("detections")
    .select("pwsid", { count: "exact", head: true })
    .eq("compound_abbrev", chem.compound_abbrev);

  let exceedingSystems = 0;
  if (chem.mcl_ppt !== null) {
    const { count } = await supabasePublic
      .from("detections")
      .select("pwsid", { count: "exact", head: true })
      .eq("compound_abbrev", chem.compound_abbrev)
      .gte("mcl_ratio", 1);
    exceedingSystems = count ?? 0;
  }

  return {
    chem,
    body: (contentRow?.body as string | null) ?? null,
    detectedSystems: detectedSystems ?? 0,
    exceedingSystems,
  };
}

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const { data } = await supabasePublic
      .from("chemicals")
      .select("compound_abbrev");
    return (data ?? []).map((c) => ({
      slug: slugify(c.compound_abbrev as string),
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const payload = await loadChemical(slug);
  if (!payload) {
    return { title: "Compound not found" };
  }
  const { chem } = payload;
  const title = `${chem.compound_abbrev} (${chem.compound_name}) in Drinking Water | CheckYourWater`;
  const description = `What is ${chem.compound_abbrev}? Health effects, EPA limits, and what to do if it's in your water.`;
  return {
    title,
    description,
    alternates: { canonical: `https://checkyourwater.org/chemical/${slug}` },
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function categoryLabel(chainLength: string | null): string {
  if (!chainLength) return "PFAS compound";
  const lc = chainLength.toLowerCase();
  if (lc.includes("long")) return "Long-chain PFAS";
  if (lc.includes("short")) return "Short-chain PFAS";
  if (lc.includes("genx") || lc.includes("replacement")) return "GenX / replacement PFAS";
  // Capitalize first letter
  return chainLength.charAt(0).toUpperCase() + chainLength.slice(1) + " PFAS";
}

export default async function ChemicalPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const payload = await loadChemical(slug);
  if (!payload) notFound();

  const { chem, body, detectedSystems, exceedingSystems } = payload;
  const hasMcl = chem.mcl_ppt !== null;

  return (
    <article className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 sm:py-16">
      {/* HERO */}
      <header>
        <p className="font-sans text-sm">
          <Link href="/methodology" className="text-blue-600 hover:underline">
            ← All PFAS compounds
          </Link>
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
          {chem.compound_abbrev}
        </h1>
        <p className="mt-2 font-serif text-xl text-slate-700">
          {chem.compound_name}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-sans text-xs text-slate-500">
          {chem.cas_number && <span>CAS {chem.cas_number}</span>}
          {chem.chemical_formula && <span>{chem.chemical_formula}</span>}
        </div>
        <div className="mt-4">
          <span className="inline-block rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-slate-700">
            {categoryLabel(chem.chain_length)}
          </span>
        </div>
      </header>

      {/* KEY STATS */}
      <dl className="mt-10 grid grid-cols-1 gap-x-6 gap-y-4 border-y border-slate-200 py-6 sm:grid-cols-3">
        <Stat
          label="EPA federal limit"
          value={hasMcl ? formatPPT(chem.mcl_ppt) : "No federal limit"}
        />
        <Stat
          label="Detected in"
          value={`${formatNumber(detectedSystems)} ${
            detectedSystems === 1 ? "system" : "systems"
          }`}
        />
        {hasMcl ? (
          <Stat
            label="Exceeds limit in"
            value={`${formatNumber(exceedingSystems)} ${
              exceedingSystems === 1 ? "system" : "systems"
            }`}
          />
        ) : (
          <Stat label="Regulatory status" value="Unregulated (UCMR 5)" />
        )}
      </dl>

      {/* AI EXPLAINER */}
      <section className="mt-12">
        {body ? (
          <>
            <div className="prose-cyw font-serif text-lg leading-relaxed text-slate-800">
              {renderMarkdown(body)}
            </div>
            <AiDisclaimer />
          </>
        ) : (
          <p className="font-sans text-base text-slate-600">
            A plain-language explainer for this compound is being prepared.
            Check back soon, or read the EPA reference below.
          </p>
        )}
      </section>

      {/* STRUCTURE IMAGE */}
      {chem.structure_image_url && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-slate-900">
            Molecular structure
          </h2>
          <figure className="mt-4 inline-block rounded-lg border border-slate-200 bg-white p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={chem.structure_image_url}
              alt={`Molecular structure of ${chem.compound_name}`}
              className="block max-h-64 w-auto"
              loading="lazy"
            />
            <figcaption className="mt-3 font-sans text-xs text-slate-500">
              Source: PubChem
            </figcaption>
          </figure>
        </section>
      )}

      {/* SOURCE LINKS */}
      <section className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <h2 className="font-serif text-xl font-semibold text-slate-900">
          Learn more about {chem.compound_abbrev}
        </h2>
        <ul className="mt-4 space-y-2 font-sans text-sm">
          {chem.pubchem_cid && (
            <li>
              <a
                href={`https://pubchem.ncbi.nlm.nih.gov/compound/${chem.pubchem_cid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                PubChem entry (CID {chem.pubchem_cid}) →
              </a>
            </li>
          )}
          <li>
            <a
              href="https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EPA PFAS overview →
            </a>
          </li>
          <li>
            <a
              href="https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EPA UCMR 5 raw data →
            </a>
          </li>
        </ul>
      </section>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-sans text-xs uppercase tracking-widest text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-serif text-2xl font-semibold text-slate-900 tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/**
 * Lightweight markdown renderer for the 5-section explainer body.
 * Only handles `## headings` and paragraphs separated by blank lines —
 * which is the only structure the prompt asks Claude to produce.
 */
function renderMarkdown(md: string): React.ReactNode {
  const blocks = md.trim().split(/\n\n+/);
  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={i}
          className="mt-10 font-serif text-2xl font-bold text-slate-900 first:mt-0"
        >
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h1 key={i} className="mt-10 font-serif text-3xl font-bold text-slate-900 first:mt-0">
          {trimmed.replace(/^#\s+/, "")}
        </h1>
      );
    }
    return (
      <p key={i} className="mt-4 first:mt-0">
        {trimmed}
      </p>
    );
  });
}
