import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, categoryLabel, formatPostDate, type BlogCategory } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Investigations & Explainers",
  description:
    "Plain-language, data-backed reporting on PFAS contamination in American drinking water. Investigations into specific cities, guides to filtration and water quality reports, and explainers on what the EPA's new limits actually mean.",
  openGraph: {
    title: "Investigations & Explainers | Check Your Water",
    description:
      "Data-backed reporting on PFAS contamination in American drinking water.",
    type: "website",
    url: "https://checkyourwater.org/blog",
  },
  alternates: { canonical: "https://checkyourwater.org/blog" },
};

const CATEGORIES: { value: BlogCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "city-investigation", label: "City Investigations" },
  { value: "explainer", label: "Explainers" },
  { value: "guide", label: "Guides" },
  { value: "news-analysis", label: "News Analysis" },
];

type SearchParams = Promise<{ category?: string }>;

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const active = (sp.category ?? "all") as BlogCategory | "all";
  const all = getAllPosts();
  const visible =
    active === "all" ? all : all.filter((p) => p.frontmatter.category === active);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-10">
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          Check Your Water
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Investigations & Explainers
        </h1>
        <p className="mt-4 max-w-[720px] font-serif text-lg leading-relaxed text-slate-700">
          Data-backed reporting on PFAS contamination in American drinking
          water. Numbers from EPA testing. Context from public records. No
          paywalls, no email gates, no editorializing.
        </p>
        <p className="mt-3 font-sans text-sm text-slate-500">
          <Link
            href="/blog/feed.xml"
            className="text-blue-600 hover:underline"
          >
            Subscribe via RSS
          </Link>
        </p>
      </header>

      {/* Category filter */}
      <nav
        aria-label="Filter by category"
        className="mt-10 flex flex-wrap gap-2"
      >
        {CATEGORIES.map((c) => {
          const isActive = c.value === active;
          const href = c.value === "all" ? "/blog" : `/blog?category=${c.value}`;
          return (
            <Link
              key={c.value}
              href={href}
              className={
                isActive
                  ? "rounded-full border-2 border-slate-900 bg-slate-900 px-4 py-1.5 font-sans text-sm font-semibold text-white"
                  : "rounded-full border-2 border-slate-300 bg-white px-4 py-1.5 font-sans text-sm font-semibold text-slate-700 hover:border-slate-900"
              }
            >
              {c.label}
            </Link>
          );
        })}
      </nav>

      {/* Article list */}
      <ul className="mt-10 grid gap-6 sm:grid-cols-2">
        {visible.length === 0 ? (
          <li className="font-sans text-base text-slate-500">
            No articles in this category yet.
          </li>
        ) : (
          visible.map((p) => (
            <li key={p.frontmatter.slug}>
              <Link
                href={`/blog/${p.frontmatter.slug}`}
                className="group block h-full rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-blue-400 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {categoryLabel(p.frontmatter.category)}
                  </span>
                  <span className="font-sans text-xs text-slate-500">
                    {formatPostDate(p.frontmatter.date)} · {p.readMinutes} min read
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-2xl font-semibold leading-snug text-slate-900 group-hover:text-blue-700">
                  {p.frontmatter.title}
                </h2>
                <p className="mt-3 font-serif text-base leading-relaxed text-slate-700">
                  {p.frontmatter.description}
                </p>
                <p className="mt-4 font-sans text-sm font-semibold text-blue-600">
                  Read the {p.frontmatter.category === "city-investigation" ? "investigation" : "article"} →
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
