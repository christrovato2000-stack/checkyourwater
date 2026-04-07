import type { Metadata } from "next";
import Link from "next/link";
import NotifySignup from "@/components/NotifySignup";
import {
  getAllNews,
  groupByMonth,
  categoryLabel,
  formatNewsDate,
  NEWS_CATEGORIES,
} from "@/lib/news";
import type { NewsCategory, NewsItem } from "@/types/database";

export const metadata: Metadata = {
  title: "PFAS News Tracker",
  description:
    "Curated coverage of PFAS contamination, regulation, and community action across America. EPA enforcement, state rules, lawsuits, research, and local reporting, summarized in plain language.",
  openGraph: {
    title: "PFAS News Tracker | Check Your Water",
    description:
      "Curated coverage of PFAS contamination, regulation, and community action across America.",
    type: "website",
    url: "https://checkyourwater.org/news",
  },
  alternates: { canonical: "https://checkyourwater.org/news" },
};

export const revalidate = 1800; // 30 minutes

type SearchParams = Promise<{ category?: string }>;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const active = (sp.category ?? "all") as NewsCategory | "all";
  const all = await getAllNews();
  const visible =
    active === "all" ? all : all.filter((n) => n.category === active);

  // Pull out any featured item (only when viewing "all").
  const featured = active === "all" ? all.find((n) => n.featured) : undefined;
  const unfeatured = featured
    ? visible.filter((n) => n.id !== featured.id)
    : visible;

  const grouped = groupByMonth(unfeatured);

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-slate-200 pb-10">
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          Check Your Water
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          PFAS News Tracker
        </h1>
        <p className="mt-4 max-w-[720px] font-serif text-lg leading-relaxed text-slate-700">
          Curated coverage of PFAS contamination, regulation, and community
          action across America. Every story is read and summarized before it
          lands here.
        </p>
      </header>

      {/* Category filter */}
      <nav
        aria-label="Filter by category"
        className="mt-10 flex flex-wrap gap-2"
      >
        {NEWS_CATEGORIES.map((c) => {
          const isActive = c.value === active;
          const href = c.value === "all" ? "/news" : `/news?category=${c.value}`;
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

      {all.length === 0 ? (
        <p className="mt-12 font-sans text-base text-slate-600">
          News items will appear here once the tracker is seeded. See{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
            scripts/seed-news.ts
          </code>
          .
        </p>
      ) : (
        <>
          {/* Featured story */}
          {featured && (
            <FeaturedCard item={featured} />
          )}

          {/* Month groups */}
          <div className="mt-12">
            {grouped.length === 0 ? (
              <p className="font-sans text-base text-slate-600">
                No news items in this category yet.
              </p>
            ) : (
              grouped.map((group) => (
                <section
                  key={group.key}
                  className="mt-10 first:mt-0"
                  aria-labelledby={`month-${group.key}`}
                >
                  <h2
                    id={`month-${group.key}`}
                    className="border-b border-slate-200 pb-2 font-serif text-xl font-semibold text-slate-700"
                  >
                    {group.label}
                  </h2>
                  <ul className="mt-6 space-y-6">
                    {group.items.map((item) => (
                      <NewsCard key={item.id} item={item} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {/* Signup at the bottom */}
      <div className="mt-20 border-t border-slate-200 pt-12">
        <NotifySignup />
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 sm:p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full bg-blue-50 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
          {categoryLabel(item.category)}
        </span>
        <span className="font-sans text-xs text-slate-500">
          {item.source_name} · {formatNewsDate(item.published_date)}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-xl font-semibold leading-snug text-slate-900">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-700 hover:underline"
        >
          {item.title}
        </a>
      </h3>
      <p className="mt-2 font-serif text-base leading-relaxed text-slate-700">
        {item.summary}
      </p>
      {item.city_slug && (
        <p className="mt-3 font-sans text-sm">
          <Link
            href={`/city/${item.city_slug}`}
            className="font-semibold text-blue-600 hover:underline"
          >
            See the {cityLinkLabel(item.city_slug)} report →
          </Link>
        </p>
      )}
    </li>
  );
}

function FeaturedCard({ item }: { item: NewsItem }) {
  return (
    <section
      aria-label="Featured story"
      className="mt-12 rounded-lg border-l-4 border-blue-600 bg-blue-50 p-6 sm:p-8"
    >
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-blue-700">
        Featured
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="rounded-full bg-white px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
          {categoryLabel(item.category)}
        </span>
        <span className="font-sans text-xs text-slate-600">
          {item.source_name} · {formatNewsDate(item.published_date)}
        </span>
      </div>
      <h2 className="mt-3 font-serif text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-700 hover:underline"
        >
          {item.title}
        </a>
      </h2>
      <p className="mt-3 font-serif text-lg leading-relaxed text-slate-800">
        {item.summary}
      </p>
      {item.city_slug && (
        <p className="mt-4 font-sans text-sm">
          <Link
            href={`/city/${item.city_slug}`}
            className="font-semibold text-blue-700 hover:underline"
          >
            See the {cityLinkLabel(item.city_slug)} report →
          </Link>
        </p>
      )}
    </section>
  );
}

function cityLinkLabel(slug: string): string {
  // Turn "merrimack-nh" into "Merrimack, NH"
  const m = slug.match(/^(.+)-([a-z]{2})$/);
  if (!m) return slug;
  const city = m[1]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return `${city}, ${m[2].toUpperCase()}`;
}
