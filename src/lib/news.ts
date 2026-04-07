/**
 * Helpers for loading curated PFAS news items from Supabase.
 * The news_items table holds stories reviewed and summarized by
 * the editorial team. See scripts/seed-news.ts and scripts/curate-news.ts.
 */
import { supabasePublic } from "@/lib/supabase";
import type { NewsItem, NewsCategory } from "@/types/database";

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  "epa-action": "EPA Action",
  "state-regulation": "State Regulation",
  legal: "Legal",
  research: "Research",
  "local-coverage": "Local Coverage",
  industry: "Industry",
};

export const NEWS_CATEGORIES: { value: NewsCategory | "all"; label: string }[] =
  [
    { value: "all", label: "All" },
    { value: "epa-action", label: "EPA Actions" },
    { value: "state-regulation", label: "State Regulation" },
    { value: "legal", label: "Legal" },
    { value: "research", label: "Research" },
    { value: "local-coverage", label: "Local Coverage" },
    { value: "industry", label: "Industry" },
  ];

export function categoryLabel(c: NewsCategory): string {
  return CATEGORY_LABELS[c] ?? c;
}

export function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Returns a stable month key used for grouping. */
export function monthKey(iso: string): string {
  // iso is YYYY-MM-DD; slice to YYYY-MM to avoid timezone issues.
  return iso.slice(0, 7);
}

/**
 * Load all published news items, newest first.
 * Safe to call from server components. Returns an empty array on error.
 */
export async function getAllNews(): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabasePublic
      .from("news_items")
      .select("*")
      .eq("status", "published")
      .order("published_date", { ascending: false });
    if (error || !data) return [];
    return data as NewsItem[];
  } catch {
    return [];
  }
}

export async function getNewsByCategory(
  category: NewsCategory
): Promise<NewsItem[]> {
  const all = await getAllNews();
  return all.filter((n) => n.category === category);
}

export async function getNewsForCity(citySlug: string): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabasePublic
      .from("news_items")
      .select("*")
      .eq("status", "published")
      .eq("city_slug", citySlug)
      .order("published_date", { ascending: false });
    if (error || !data) return [];
    return data as NewsItem[];
  } catch {
    return [];
  }
}

export async function getLatestNews(limit: number): Promise<NewsItem[]> {
  try {
    const { data, error } = await supabasePublic
      .from("news_items")
      .select("*")
      .eq("status", "published")
      .order("published_date", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as NewsItem[];
  } catch {
    return [];
  }
}

/**
 * Group news items into an ordered list of month buckets, newest first.
 * Each bucket preserves the input order (which should already be newest-first
 * by published_date).
 */
export function groupByMonth(items: NewsItem[]): {
  key: string;
  label: string;
  items: NewsItem[];
}[] {
  const groups = new Map<string, NewsItem[]>();
  for (const item of items) {
    const key = monthKey(item.published_date);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  const ordered = Array.from(groups.entries())
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([key, list]) => ({
      key,
      label: monthLabel(list[0].published_date),
      items: list,
    }));
  return ordered;
}
