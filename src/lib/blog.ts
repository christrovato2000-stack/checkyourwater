/**
 * Blog content loader.
 *
 * Reads .mdx files from /content/blog at build time, parses YAML
 * frontmatter, converts the markdown body to HTML, and computes
 * derived fields (read time, table of contents from H2 headings).
 *
 * This runs at build time only (Node.js fs). All blog routes are
 * statically generated, so there's no request-time fs access.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { Marked, Renderer, type Tokens, type RendererObject } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogCategory =
  | "city-investigation"
  | "explainer"
  | "guide"
  | "news-analysis";

export interface BlogFrontmatter {
  title: string;
  slug: string;
  description: string;
  date: string; // ISO YYYY-MM-DD
  author: string;
  city_slug?: string;
  category: BlogCategory;
  featured_image_alt?: string;
  last_updated?: string;
}

export interface TocItem {
  id: string;
  text: string;
}

export interface BlogPost {
  frontmatter: BlogFrontmatter;
  bodyMarkdown: string;
  bodyHtml: string;
  readMinutes: number;
  wordCount: number;
  toc: TocItem[];
}

let cache: BlogPost[] | null = null;

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

/** Add stable id="..." attributes to H2/H3 headings so the TOC can link to them. */
function renderHtmlWithHeadingIds(md: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();

  const rendererObject: RendererObject = {
    heading(this: Renderer, { tokens, depth }: Tokens.Heading) {
      const inline = this.parser.parseInline(tokens);
      const plain = inline.replace(/<[^>]+>/g, "");
      const base = slugifyHeading(plain);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      if (depth === 2) toc.push({ id, text: plain });
      return `<h${depth} id="${id}">${inline}</h${depth}>\n`;
    },
    link(this: Renderer, { href, title, tokens }: Tokens.Link) {
      const inline = this.parser.parseInline(tokens);
      const isExternal = /^https?:\/\//i.test(href ?? "");
      const titleAttr = title ? ` title="${title}"` : "";
      if (isExternal) {
        return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${inline}</a>`;
      }
      return `<a href="${href}"${titleAttr}>${inline}</a>`;
    },
  };

  const m = new Marked({ gfm: true, breaks: false });
  m.use({ renderer: rendererObject });
  const html = m.parse(md, { async: false }) as string;

  return { html, toc };
}

function loadAll(): BlogPost[] {
  if (cache) return cache;
  if (!fs.existsSync(BLOG_DIR)) {
    cache = [];
    return cache;
  }
  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"));

  const posts: BlogPost[] = files.map((file) => {
    const full = path.join(BLOG_DIR, file);
    const raw = fs.readFileSync(full, "utf8");
    const { data, content } = matter(raw);
    const fm = data as BlogFrontmatter;
    if (!fm.slug) {
      fm.slug = file.replace(/\.(mdx?|md)$/, "");
    }
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const readMinutes = Math.max(1, Math.round(wordCount / 200));
    const { html, toc } = renderHtmlWithHeadingIds(content);
    return {
      frontmatter: fm,
      bodyMarkdown: content,
      bodyHtml: html,
      readMinutes,
      wordCount,
      toc,
    };
  });

  // Newest first.
  posts.sort((a, b) => (a.frontmatter.date > b.frontmatter.date ? -1 : 1));
  cache = posts;
  return cache;
}

export function getAllPosts(): BlogPost[] {
  return loadAll();
}

export function getPostBySlug(slug: string): BlogPost | null {
  return loadAll().find((p) => p.frontmatter.slug === slug) ?? null;
}

export function getPostsByCategory(category: BlogCategory): BlogPost[] {
  return loadAll().filter((p) => p.frontmatter.category === category);
}

export function getPostByCitySlug(citySlug: string): BlogPost | null {
  return (
    loadAll().find(
      (p) =>
        p.frontmatter.category === "city-investigation" &&
        p.frontmatter.city_slug === citySlug
    ) ?? null
  );
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const all = loadAll();
  const current = all.find((p) => p.frontmatter.slug === slug);
  if (!current) return [];
  const others = all.filter((p) => p.frontmatter.slug !== slug);
  // Score: same city +3, same category +1.
  const scored = others.map((p) => {
    let score = 0;
    if (
      current.frontmatter.city_slug &&
      p.frontmatter.city_slug === current.frontmatter.city_slug
    )
      score += 3;
    if (p.frontmatter.category === current.frontmatter.category) score += 1;
    return { post: p, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}

export function categoryLabel(c: BlogCategory): string {
  switch (c) {
    case "city-investigation":
      return "City Investigation";
    case "explainer":
      return "Explainer";
    case "guide":
      return "Guide";
    case "news-analysis":
      return "News Analysis";
  }
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
