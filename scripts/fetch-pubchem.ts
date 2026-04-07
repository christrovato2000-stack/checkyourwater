/**
 * Fetch PubChem data for the 29 UCMR 5 PFAS compounds.
 *
 * For each compound:
 *   1. Resolve to a PubChem CID via CAS number lookup.
 *   2. Pull molecular formula + weight from /compound/cid/{cid}/property.
 *   3. Pull a structure PNG URL.
 *   4. Cache JSON responses to data/pubchem-cache/{abbrev}.json.
 *
 * Output: data/chemicals.json
 *
 * Run: npm run data:pubchem
 */
import * as fs from "fs";
import * as path from "path";
import { PFAS_COMPOUNDS } from "../src/lib/constants";

const DATA_DIR = path.join(__dirname, "..", "data");
const CACHE_DIR = path.join(DATA_DIR, "pubchem-cache");
const OUTPUT = path.join(DATA_DIR, "chemicals.json");

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";
const RATE_LIMIT_DELAY = 250; // 4 req/sec, under PubChem's 5/sec limit

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "checkyourwater.org/1.0 (research)" },
    });
    if (!res.ok) {
      console.warn(`  ${res.status} ${url}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`  fetch error ${url}: ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

  const out: any[] = [];

  for (const c of PFAS_COMPOUNDS) {
    const cacheFile = path.join(CACHE_DIR, `${c.abbrev.replace(/[:/\\]/g, "_")}.json`);
    let cached: any = null;
    if (fs.existsSync(cacheFile)) {
      try {
        cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      } catch {}
    }

    if (cached?.cid) {
      console.log(`  cache hit ${c.abbrev} (cid ${cached.cid})`);
      out.push({
        compound_abbrev: c.abbrev,
        compound_name: c.name,
        cas_number: c.cas,
        chemical_formula: cached.formula ?? null,
        mcl_ppt: c.mclPpt,
        mcl_status: c.mclStatus,
        mrl_ppt: null,
        chain_length: c.chainLength,
        health_effects: null,
        common_sources: null,
        pubchem_cid: cached.cid,
        structure_image_url: cached.structure_image_url ?? null,
      });
      continue;
    }

    console.log(`  fetching ${c.abbrev} (CAS ${c.cas})...`);
    const cidUrl = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(c.cas)}/cids/JSON`;
    const cidResp = await fetchJson(cidUrl);
    await sleep(RATE_LIMIT_DELAY);

    let cid: number | null = null;
    if (cidResp?.IdentifierList?.CID?.length) {
      cid = cidResp.IdentifierList.CID[0];
    }

    let formula: string | null = null;
    let structure_image_url: string | null = null;
    if (cid) {
      const propUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/MolecularFormula,MolecularWeight/JSON`;
      const propResp = await fetchJson(propUrl);
      await sleep(RATE_LIMIT_DELAY);
      formula =
        propResp?.PropertyTable?.Properties?.[0]?.MolecularFormula ?? null;
      structure_image_url = `${PUBCHEM_BASE}/compound/cid/${cid}/PNG`;
    }

    const cacheRow = { cid, formula, structure_image_url };
    fs.writeFileSync(cacheFile, JSON.stringify(cacheRow, null, 2));

    out.push({
      compound_abbrev: c.abbrev,
      compound_name: c.name,
      cas_number: c.cas,
      chemical_formula: formula,
      mcl_ppt: c.mclPpt,
      mcl_status: c.mclStatus,
      mrl_ppt: null,
      chain_length: c.chainLength,
      health_effects: null,
      common_sources: null,
      pubchem_cid: cid,
      structure_image_url,
    });
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
  const found = out.filter((c) => c.pubchem_cid).length;
  console.log(`\nWrote ${out.length} chemicals (${found} with PubChem CID) to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
