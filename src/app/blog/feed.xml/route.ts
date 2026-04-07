/**
 * Atom feed for the /blog. Journalists can subscribe in their RSS reader.
 */
import { getAllPosts } from "@/lib/blog";

const SITE = "https://checkyourwater.org";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET(): Response {
  const posts = getAllPosts();
  const updated =
    posts.length > 0
      ? new Date(posts[0].frontmatter.last_updated ?? posts[0].frontmatter.date).toISOString()
      : new Date().toISOString();

  const entries = posts
    .map((p) => {
      const url = `${SITE}/blog/${p.frontmatter.slug}`;
      const published = new Date(p.frontmatter.date).toISOString();
      const modified = new Date(
        p.frontmatter.last_updated ?? p.frontmatter.date
      ).toISOString();
      return `  <entry>
    <id>${url}</id>
    <title>${escape(p.frontmatter.title)}</title>
    <link href="${url}"/>
    <published>${published}</published>
    <updated>${modified}</updated>
    <author><name>${escape(p.frontmatter.author)}</name></author>
    <category term="${escape(p.frontmatter.category)}"/>
    <summary type="html">${escape(p.frontmatter.description)}</summary>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Check Your Water — Investigations &amp; Explainers</title>
  <subtitle>Data-backed reporting on PFAS contamination in American drinking water.</subtitle>
  <link href="${SITE}/blog/feed.xml" rel="self"/>
  <link href="${SITE}/blog"/>
  <id>${SITE}/blog</id>
  <updated>${updated}</updated>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
