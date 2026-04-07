/**
 * TypeScript interfaces for checkyourwater.org's Supabase schema.
 * Keep these in sync with scripts/schema.sql.
 */

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface WaterSystem {
  pwsid: string;
  pws_name: string;
  city_served: string | null;
  state_code: string;
  county: string | null;
  population_served: number | null;
  source_type: string | null;
  latitude: number | null;
  longitude: number | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_pfas_detected: number;
  data_release: number | null;
  last_updated?: string;
  created_at?: string;
}

export interface Detection {
  id?: number;
  pwsid: string;
  compound_name: string;
  compound_abbrev: string;
  cas_number: string | null;
  avg_concentration: number | null;
  max_concentration: number | null;
  min_concentration: number | null;
  sample_count: number;
  detection_count: number;
  mrl: number | null;
  mcl: number | null;
  mcl_ratio: number | null;
  has_mcl: boolean;
  created_at?: string;
}

export interface Chemical {
  compound_abbrev: string;
  compound_name: string;
  cas_number: string | null;
  chemical_formula: string | null;
  mcl_ppt: number | null;
  mcl_status: string | null;
  mrl_ppt: number | null;
  chain_length: string | null;
  health_effects: string | null;
  common_sources: string | null;
  pubchem_cid: number | null;
  structure_image_url: string | null;
  created_at?: string;
}

export interface ZipMapping {
  zip_code: string;
  pwsid: string;
  pws_name: string | null;
  population_served: number | null;
  source_type: string | null;
  mapping_tier: number;
  confidence: "high" | "medium" | "low";
  is_primary: boolean;
  manually_verified: boolean;
  created_at?: string;
}

export interface CityProfile {
  slug: string;
  city_name: string;
  state_code: string;
  state_name: string;
  population: number | null;
  systems_count: number | null;
  primary_pwsid: string | null;
  grade: Grade | null;
  worst_compound: string | null;
  worst_ratio: number | null;
  total_detections: number | null;
  total_exceedances: number | null;
  latitude: number | null;
  longitude: number | null;
  contamination_source: string | null;
  settlement_status: string | null;
  news_hook: string | null;
  launch_wave: number;
  created_at?: string;
  updated_at?: string;
}

export interface Content {
  id?: number;
  content_type: string;
  reference_key: string;
  title: string;
  body: string;
  reading_level?: string;
  model_used?: string;
  generation_date?: string | null;
  review_status?: "pending" | "approved" | "rejected";
  reviewer_notes?: string | null;
  approved_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** What our zip-search API returns to the web client. */
export interface SearchResult {
  zip_code: string;
  systems: Array<{
    pwsid: string;
    pws_name: string;
    city_served: string | null;
    state_code: string;
    population_served: number | null;
    grade: Grade | null;
    worst_compound: string | null;
    worst_ratio: number | null;
    total_pfas_detected: number;
    is_primary: boolean;
    confidence: string;
  }>;
}
