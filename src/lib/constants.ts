/**
 * checkyourwater.org — application constants
 *
 * ALL CONCENTRATIONS ARE IN PARTS PER TRILLION (ppt = ng/L).
 * The UCMR 5 dataset reports in µg/L. Multiply by 1000 to convert to ppt.
 */

export type Grade = "A" | "B" | "C" | "D" | "F";

/**
 * EPA final PFAS National Primary Drinking Water Regulation (April 2024)
 * Five regulated compounds with numeric MCLs, plus a Hazard Index MCL for
 * mixtures of PFHxS, PFNA, HFPO-DA, and PFBS (unitless, set at 1.0).
 */
export const EPA_MCL_PPT: Record<string, number> = {
  PFOA: 4.0,
  PFOS: 4.0,
  PFHxS: 10.0,
  PFNA: 10.0,
  "HFPO-DA": 10.0, // GenX Chemicals
};

/** Hazard Index MCL for the PFHxS + PFNA + HFPO-DA + PFBS mixture. */
export const EPA_HAZARD_INDEX_MCL = 1.0;

/** Health-Based Water Concentrations used in the Hazard Index (ng/L). */
export const HAZARD_INDEX_HBWC_PPT: Record<string, number> = {
  PFHxS: 10.0,
  PFNA: 10.0,
  "HFPO-DA": 10.0,
  PFBS: 2000.0,
};

/**
 * Letter-grade thresholds based on worst MCL ratio across a system's
 * regulated PFAS detections.
 *
 * A: No PFAS detected above MRL
 * B: PFAS detected, all MCL ratios < 0.5
 * C: Worst MCL ratio between 0.5 and 1.0
 * D: Worst MCL ratio between 1.0 and 5.0
 * F: Worst MCL ratio above 5.0
 *
 * For systems that only detect non-regulated PFAS, grade by detection count:
 *   0 -> A, 1-2 -> B, 3-5 -> C, 6+ -> D
 */
export const GRADE_THRESHOLDS = {
  B_UPPER: 0.5,
  C_UPPER: 1.0,
  D_UPPER: 5.0,
} as const;

export function gradeFromMclRatio(worstRatio: number | null): Grade | null {
  if (worstRatio === null) return null;
  if (worstRatio > GRADE_THRESHOLDS.D_UPPER) return "F";
  if (worstRatio > GRADE_THRESHOLDS.C_UPPER) return "D";
  if (worstRatio > GRADE_THRESHOLDS.B_UPPER) return "C";
  return "B";
}

export function gradeFromDetectionCount(count: number): Grade {
  if (count === 0) return "A";
  if (count <= 2) return "B";
  if (count <= 5) return "C";
  return "D";
}

/** Shape of a UCMR 5 PFAS contaminant record. */
export interface PfasCompound {
  /** Abbreviation used as the compound_abbrev key across the app. */
  abbrev: string;
  /** Full IUPAC / EPA contaminant name. */
  name: string;
  /** Alternate names that may appear in raw UCMR 5 "Contaminant" column. */
  aliases?: string[];
  cas: string;
  /** "short" (<= C6) or "long" (>= C7) or "replacement" etc. */
  chainLength: string;
  /** EPA MCL in ppt if regulated, otherwise null. */
  mclPpt: number | null;
  /** Regulatory status text. */
  mclStatus: string;
}

/**
 * The 29 PFAS compounds measured under UCMR 5.
 * Lithium (CAS 7439-93-2) is the 30th UCMR 5 analyte and is NOT a PFAS —
 * we deliberately omit it from this table. Filter it out when parsing.
 *
 * References:
 *  - 40 CFR 141.40(a)(3) — Table 1 to Paragraph (a)(3) (UCMR 5 analyte list)
 *  - EPA UCMR 5 Analytical Methods fact sheet (EPA 815-F-21-004)
 */
export const PFAS_COMPOUNDS: PfasCompound[] = [
  {
    abbrev: "11Cl-PF3OUdS",
    name: "11-chloroeicosafluoro-3-oxaundecane-1-sulfonic acid",
    aliases: ["11-chloroeicosafluoro-3-oxaundecane-1-sulfonic acid"],
    cas: "763051-92-9",
    chainLength: "long-chain chlorinated ether",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "9Cl-PF3ONS",
    name: "9-chlorohexadecafluoro-3-oxanonane-1-sulfonic acid",
    aliases: ["9-chlorohexadecafluoro-3-oxanonane-1-sulfonic acid"],
    cas: "756426-58-1",
    chainLength: "short-chain chlorinated ether (F-53B)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "HFPO-DA",
    name: "Hexafluoropropylene oxide dimer acid",
    aliases: [
      "HFPO-DA",
      "GenX",
      "GenX Chemicals",
      "hexafluoropropylene oxide dimer acid",
    ],
    cas: "13252-13-6",
    chainLength: "replacement (GenX)",
    mclPpt: 10.0,
    mclStatus: "Regulated — EPA NPDWR (April 2024)",
  },
  {
    abbrev: "ADONA",
    name: "4,8-dioxa-3H-perfluorononanoic acid",
    aliases: ["ADONA", "4,8-dioxa-3H-perfluorononanoic acid"],
    cas: "919005-14-4",
    chainLength: "replacement",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "NFDHA",
    name: "Nonafluoro-3,6-dioxaheptanoic acid",
    aliases: ["NFDHA", "nonafluoro-3,6-dioxaheptanoic acid"],
    cas: "151772-58-6",
    chainLength: "short-chain ether",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFMPA",
    name: "Perfluoro-3-methoxypropanoic acid",
    aliases: ["PFMPA", "perfluoro-3-methoxypropanoic acid"],
    cas: "377-73-1",
    chainLength: "short-chain ether",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFMBA",
    name: "Perfluoro(4-methoxybutanoic) acid",
    aliases: ["PFMBA", "perfluoro-4-methoxybutanoic acid"],
    cas: "863090-89-5",
    chainLength: "short-chain ether",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFEESA",
    name: "Perfluoro (2-ethoxyethane) sulfonic acid",
    aliases: ["PFEESA", "perfluoro (2-ethoxyethane) sulfonic acid"],
    cas: "113507-82-7",
    chainLength: "short-chain ether sulfonate",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFBA",
    name: "Perfluorobutanoic acid",
    aliases: ["PFBA", "perfluorobutanoic acid"],
    cas: "375-22-4",
    chainLength: "short (C4)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFPeA",
    name: "Perfluoropentanoic acid",
    aliases: ["PFPeA", "perfluoropentanoic acid"],
    cas: "2706-90-3",
    chainLength: "short (C5)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFHxA",
    name: "Perfluorohexanoic acid",
    aliases: ["PFHxA", "perfluorohexanoic acid"],
    cas: "307-24-4",
    chainLength: "short (C6)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFHpA",
    name: "Perfluoroheptanoic acid",
    aliases: ["PFHpA", "perfluoroheptanoic acid"],
    cas: "375-85-9",
    chainLength: "long (C7)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFOA",
    name: "Perfluorooctanoic acid",
    aliases: ["PFOA", "perfluorooctanoic acid"],
    cas: "335-67-1",
    chainLength: "long (C8)",
    mclPpt: 4.0,
    mclStatus: "Regulated — EPA NPDWR (April 2024)",
  },
  {
    abbrev: "PFNA",
    name: "Perfluorononanoic acid",
    aliases: ["PFNA", "perfluorononanoic acid"],
    cas: "375-95-1",
    chainLength: "long (C9)",
    mclPpt: 10.0,
    mclStatus: "Regulated — EPA NPDWR (April 2024)",
  },
  {
    abbrev: "PFDA",
    name: "Perfluorodecanoic acid",
    aliases: ["PFDA", "perfluorodecanoic acid"],
    cas: "335-76-2",
    chainLength: "long (C10)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFUnA",
    name: "Perfluoroundecanoic acid",
    aliases: ["PFUnA", "PFUnDA", "perfluoroundecanoic acid"],
    cas: "2058-94-8",
    chainLength: "long (C11)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFDoA",
    name: "Perfluorododecanoic acid",
    aliases: ["PFDoA", "PFDoDA", "perfluorododecanoic acid"],
    cas: "307-55-1",
    chainLength: "long (C12)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFTrDA",
    name: "Perfluorotridecanoic acid",
    aliases: ["PFTrDA", "perfluorotridecanoic acid"],
    cas: "72629-94-8",
    chainLength: "long (C13)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFTA",
    name: "Perfluorotetradecanoic acid",
    aliases: ["PFTA", "PFTeDA", "perfluorotetradecanoic acid"],
    cas: "376-06-7",
    chainLength: "long (C14)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFBS",
    name: "Perfluorobutanesulfonic acid",
    aliases: ["PFBS", "perfluorobutanesulfonic acid"],
    cas: "375-73-5",
    chainLength: "short (C4)",
    mclPpt: null,
    mclStatus: "Unregulated; contributes to Hazard Index MCL",
  },
  {
    abbrev: "PFPeS",
    name: "Perfluoropentanesulfonic acid",
    aliases: ["PFPeS", "perfluoropentanesulfonic acid"],
    cas: "2706-91-4",
    chainLength: "short (C5)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFHxS",
    name: "Perfluorohexanesulfonic acid",
    aliases: ["PFHxS", "perfluorohexanesulfonic acid"],
    cas: "355-46-4",
    chainLength: "short (C6)",
    mclPpt: 10.0,
    mclStatus: "Regulated — EPA NPDWR (April 2024)",
  },
  {
    abbrev: "PFHpS",
    name: "Perfluoroheptanesulfonic acid",
    aliases: ["PFHpS", "perfluoroheptanesulfonic acid"],
    cas: "375-92-8",
    chainLength: "long (C7)",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "PFOS",
    name: "Perfluorooctanesulfonic acid",
    aliases: ["PFOS", "perfluorooctanesulfonic acid"],
    cas: "1763-23-1",
    chainLength: "long (C8)",
    mclPpt: 4.0,
    mclStatus: "Regulated — EPA NPDWR (April 2024)",
  },
  {
    abbrev: "4:2FTS",
    name: "1H,1H,2H,2H-perfluorohexanesulfonic acid (4:2 FTS)",
    aliases: ["4:2FTS", "4:2 FTS", "1H,1H,2H,2H-perfluorohexanesulfonic acid"],
    cas: "757124-72-4",
    chainLength: "fluorotelomer",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "6:2FTS",
    name: "1H,1H,2H,2H-perfluorooctanesulfonic acid (6:2 FTS)",
    aliases: ["6:2FTS", "6:2 FTS", "1H,1H,2H,2H-perfluorooctanesulfonic acid"],
    cas: "27619-97-2",
    chainLength: "fluorotelomer",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "8:2FTS",
    name: "1H,1H,2H,2H-perfluorodecanesulfonic acid (8:2 FTS)",
    aliases: ["8:2FTS", "8:2 FTS", "1H,1H,2H,2H-perfluorodecanesulfonic acid"],
    cas: "39108-34-4",
    chainLength: "fluorotelomer",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "NEtFOSAA",
    name: "N-ethyl perfluorooctanesulfonamidoacetic acid",
    aliases: ["NEtFOSAA", "n-ethyl perfluorooctanesulfonamidoacetic acid"],
    cas: "2991-50-6",
    chainLength: "long-chain precursor",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
  {
    abbrev: "NMeFOSAA",
    name: "N-methyl perfluorooctanesulfonamidoacetic acid",
    aliases: ["NMeFOSAA", "n-methyl perfluorooctanesulfonamidoacetic acid"],
    cas: "2355-31-9",
    chainLength: "long-chain precursor",
    mclPpt: null,
    mclStatus: "Unregulated (UCMR 5 monitoring)",
  },
];

/** Lookup tables for parsing raw UCMR 5 "Contaminant" strings. */
export const PFAS_BY_ABBREV: Record<string, PfasCompound> = Object.fromEntries(
  PFAS_COMPOUNDS.map((c) => [c.abbrev.toLowerCase(), c])
);
export const PFAS_BY_CAS: Record<string, PfasCompound> = Object.fromEntries(
  PFAS_COMPOUNDS.map((c) => [c.cas, c])
);

/**
 * Given a raw contaminant string from the UCMR 5 "Contaminant" column,
 * match it to one of the 29 PFAS compounds. Returns null if not a PFAS
 * (e.g. lithium) or no match is found.
 */
export function matchPfasCompound(raw: string): PfasCompound | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes("lithium")) return null;

  // Direct abbreviation match
  if (PFAS_BY_ABBREV[s]) return PFAS_BY_ABBREV[s];

  // Match by alias/name substring
  for (const c of PFAS_COMPOUNDS) {
    if (s === c.abbrev.toLowerCase()) return c;
    if (s === c.name.toLowerCase()) return c;
    if (c.aliases?.some((a) => s === a.toLowerCase())) return c;
  }
  // Fuzzier: contained alias
  for (const c of PFAS_COMPOUNDS) {
    if (c.aliases?.some((a) => s.includes(a.toLowerCase()))) return c;
  }
  return null;
}

export const UCMR5_PFAS_ABBREVS = PFAS_COMPOUNDS.map((c) => c.abbrev);

/** Our ten Wave 1 launch cities, keyed by slug. */
export const LAUNCH_CITIES = [
  {
    slug: "calhoun-ga",
    city: "Calhoun",
    state: "GA",
    stateName: "Georgia",
    zips: ["30701", "30703"],
    population: 17000,
    contaminationSource: "Carpet industry / Dalton-area PFAS discharge",
    settlementStatus: "3M/DuPont settlements flowing; multi-county testing underway",
    newsHook:
      "PBS FRONTLINE documentary (Feb 2026), Erin Brockovich town halls, Emory blood testing, GA legislative fight",
  },
  {
    slug: "merrimack-nh",
    city: "Merrimack",
    state: "NH",
    stateName: "New Hampshire",
    zips: ["03054"],
    population: 26600,
    contaminationSource: "Saint-Gobain Performance Plastics",
    settlementStatus: "Saint-Gobain remediation deal signed March 2026",
    newsHook: "NHPR 'Safe to Drink' podcast; Goldman Prize winner Laurene Allen; ICE facility controversy",
  },
  {
    slug: "oscoda-mi",
    city: "Oscoda",
    state: "MI",
    stateName: "Michigan",
    zips: ["48750"],
    population: 7000,
    contaminationSource: "Wurtsmith Air Force Base AFFF firefighting foam",
    settlementStatus: "Ongoing DoD remediation; 3M settlement eligible",
    newsHook: "First community where military PFAS entered civilian water; Need Our Water; GLPAN",
  },
  {
    slug: "peshtigo-wi",
    city: "Peshtigo",
    state: "WI",
    stateName: "Wisconsin",
    zips: ["54157"],
    population: 4000,
    contaminationSource: "Tyco Fire Products AFFF testing facility",
    settlementStatus: "Tyco/Johnson Controls settlement; bottled water still being provided",
    newsHook: "PFOA at 10,000 ppt in extraction wells (2,500x MCL); residents still on bottled water",
  },
  {
    slug: "newburgh-ny",
    city: "Newburgh",
    state: "NY",
    stateName: "New York",
    zips: ["12550", "12551"],
    population: 28775,
    contaminationSource: "Stewart Air National Guard Base AFFF",
    settlementStatus: "Settlement eligible; Schumer/Gillibrand pressure",
    newsHook: "Environmental justice community; PFOS at 5,900 ppt; Clearwater/Riverkeeper partners",
  },
  {
    slug: "stuart-fl",
    city: "Stuart",
    state: "FL",
    stateName: "Florida",
    zips: ["34994", "34995", "34996", "34997"],
    population: 17500,
    contaminationSource: "Firefighter training / AFFF",
    settlementStatus: "Lead 3M plaintiff city; Phase 2 deadlines June/July 2026",
    newsHook: "Face of 'has your water system filed?' national campaign",
  },
  {
    slug: "hoosick-falls-ny",
    city: "Hoosick Falls",
    state: "NY",
    stateName: "New York",
    zips: ["12090"],
    population: 3500,
    contaminationSource: "Saint-Gobain / Honeywell plastics plants",
    settlementStatus: "Saint-Gobain/Honeywell settlement resolved",
    newsHook: "Michael Hickey origin story — the village that broke PFAS into national news",
  },
  {
    slug: "bennington-vt",
    city: "Bennington",
    state: "VT",
    stateName: "Vermont",
    zips: ["05201"],
    population: 15333,
    contaminationSource: "ChemFab / Saint-Gobain fabric plant",
    settlementStatus: "Saint-Gobain settlement; plume expansion ongoing",
    newsHook: "VT national policy leadership; PFOA at 2,880 ppt; plume still spreading",
  },
  {
    slug: "parchment-mi",
    city: "Parchment",
    state: "MI",
    stateName: "Michigan",
    zips: ["49004"],
    population: 1926,
    contaminationSource: "Crown Vantage / paper mill legacy",
    settlementStatus: "State emergency triggered 2018; now on Kalamazoo water",
    newsHook: "PFOS at 740 ppt (185x MCL); active MiPEHS study reporting 2026",
  },
  {
    slug: "warminster-pa",
    city: "Warminster",
    state: "PA",
    stateName: "Pennsylvania",
    zips: ["18974"],
    population: 33678,
    contaminationSource: "Naval Air Warfare Center / Willow Grove AFFF",
    settlementStatus: "Navy remediation; 3M/DuPont settlement eligible",
    newsHook: "22,400 ppt combined PFOS+PFOA off-base (5,600x MCL); BuxMont Coalition",
  },
] as const;
