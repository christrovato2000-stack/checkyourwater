import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase";
import { getAllPosts } from "@/lib/blog";

const BASE = "https://checkyourwater.org";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/methodology`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE}/action`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE}/cities`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${BASE}/blog`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/press`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const blogPages: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${BASE}/blog/${p.frontmatter.slug}`,
    lastModified: new Date(p.frontmatter.last_updated ?? p.frontmatter.date),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  let cityPages: MetadataRoute.Sitemap = [];
  let chemicalPages: MetadataRoute.Sitemap = [];

  try {
    const { data: cities } = await supabasePublic
      .from("cities")
      .select("slug, updated_at");
    cityPages = (cities ?? []).map((c) => ({
      url: `${BASE}/city/${c.slug as string}`,
      lastModified: c.updated_at ? new Date(c.updated_at as string) : now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch (err) {
    console.error("[sitemap] cities query failed", err);
  }

  try {
    const { data: chemicals } = await supabasePublic
      .from("chemicals")
      .select("compound_abbrev");
    chemicalPages = (chemicals ?? []).map((c) => ({
      url: `${BASE}/chemical/${(c.compound_abbrev as string).toLowerCase()}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));
  } catch (err) {
    console.error("[sitemap] chemicals query failed", err);
  }

  return [...staticPages, ...cityPages, ...chemicalPages, ...blogPages];
}
