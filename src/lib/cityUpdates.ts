/**
 * Helpers for the "What Happened Next" tracker on city pages.
 * Reads from the city_updates Supabase table seeded by editors.
 */
import { supabasePublic } from "@/lib/supabase";
import type { CityUpdate, CityUpdateCategory } from "@/types/database";

const CATEGORY_LABELS: Record<CityUpdateCategory, string> = {
  "government-action": "Government Action",
  "utility-response": "Utility Response",
  legal: "Legal",
  "community-action": "Community Action",
  "media-coverage": "Media Coverage",
};

const CATEGORY_BADGE_CLASSES: Record<CityUpdateCategory, string> = {
  "government-action": "bg-blue-100 text-blue-800",
  "utility-response": "bg-green-100 text-green-800",
  legal: "bg-purple-100 text-purple-800",
  "community-action": "bg-orange-100 text-orange-800",
  "media-coverage": "bg-slate-200 text-slate-700",
};

export function cityUpdateCategoryLabel(c: CityUpdateCategory): string {
  return CATEGORY_LABELS[c] ?? c;
}

export function cityUpdateBadgeClasses(c: CityUpdateCategory): string {
  return CATEGORY_BADGE_CLASSES[c] ?? "bg-slate-100 text-slate-700";
}

export function formatUpdateMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/**
 * Load updates for a single city, newest first. Returns [] on error or
 * if the table doesn't exist yet (migration not applied).
 */
export async function getCityUpdates(citySlug: string): Promise<CityUpdate[]> {
  try {
    const { data, error } = await supabasePublic
      .from("city_updates")
      .select("*")
      .eq("city_slug", citySlug)
      .order("update_date", { ascending: false });
    if (error || !data) return [];
    return data as CityUpdate[];
  } catch {
    return [];
  }
}
