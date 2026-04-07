import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ZipSearch from "@/components/ZipSearch";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  categoryLabel,
  formatPostDate,
} from "@/lib/blog";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllPosts().map((p) => ({ slug: p.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return {
      title: "Article not found",
      description: "We couldn't find that article.",
    };
  }
  const { title, description, date, last_updated } = post.frontmatter;
  const url = `https://checkyourwater.org/blog/${slug}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "Check Your Water",
      publishedTime: new Date(date).toISOString(),
      modifiedTime: last_updated
        ? new Date(last_updated).toISOString()
        : new Date(date).toISOString(),
      authors: [post.frontmatter.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: { canonical: url },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);
  const { frontmatter: fm, bodyHtml, readMinutes, toc } = post;
  const url = `https://checkyourwater.org/blog/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    datePublished: new Date(fm.date).toISOString(),
    dateModified: new Date(fm.last_updated ?? fm.date).toISOString(),
    author: {
      "@type": "Organization",
      name: fm.author,
      url: "https://checkyourwater.org/about",
    },
    publisher: {
      "@type": "Organization",
      name: "Check Your Water",
      url: "https://checkyourwater.org",
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };

  const shareText = encodeURIComponent(`${fm.title} — ${fm.description}`);
  const shareUrl = encodeURIComponent(url);
  const twitterShare = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const facebookShare = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-[1100px] px-4 pt-8 sm:px-6"
      >
        <ol className="flex flex-wrap items-center gap-x-2 font-sans text-sm text-slate-500">
          <li>
            <Link href="/" className="hover:text-blue-600 hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/blog" className="hover:text-blue-600 hover:underline">
              Blog
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="truncate text-slate-700">{fm.title}</li>
        </ol>
      </nav>

      <div className="mx-auto grid max-w-[1100px] gap-12 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_220px]">
        {/* MAIN COLUMN */}
        <article className="min-w-0">
          <header>
            <span className="inline-block rounded-full bg-blue-50 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
              {categoryLabel(fm.category)}
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              {fm.title}
            </h1>
            <p className="mt-5 font-serif text-xl leading-snug text-slate-700">
              {fm.description}
            </p>
            <p className="mt-6 font-sans text-sm text-slate-500">
              By {fm.author} · {formatPostDate(fm.date)} · {readMinutes} min read
              {fm.last_updated && fm.last_updated !== fm.date && (
                <> · Updated {formatPostDate(fm.last_updated)}</>
              )}
            </p>
          </header>

          {/* Mobile TOC (collapsible) */}
          {toc.length > 1 && (
            <details className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:hidden">
              <summary className="cursor-pointer font-sans text-sm font-semibold text-slate-900">
                Table of contents
              </summary>
              <ol className="mt-3 space-y-2 font-sans text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="text-slate-700 hover:text-blue-600 hover:underline"
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {/* Body */}
          <div
            className="article-body mt-10"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* Share */}
          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6">
            <span className="font-sans text-sm font-semibold text-slate-700">
              Share this story:
            </span>
            <a
              href={twitterShare}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 font-sans text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
            >
              Share on Twitter
            </a>
            <a
              href={facebookShare}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 font-sans text-sm font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-600"
            >
              Share on Facebook
            </a>
          </div>

          {/* Check your water CTA */}
          <section className="mt-12 rounded-lg border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h2 className="font-serif text-2xl font-semibold text-slate-900">
              Check your own water
            </h2>
            <p className="mt-2 font-sans text-base text-slate-700">
              Free. No email required. Enter a zip code to see EPA test results
              for the system that serves it.
            </p>
            <div className="mt-5">
              <ZipSearch />
            </div>
          </section>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-16 border-t border-slate-200 pt-10">
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                Related reading
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                {related.map((r) => (
                  <li key={r.frontmatter.slug}>
                    <Link
                      href={`/blog/${r.frontmatter.slug}`}
                      className="group block h-full rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-blue-400 hover:shadow-sm"
                    >
                      <span className="font-sans text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {categoryLabel(r.frontmatter.category)}
                      </span>
                      <p className="mt-2 font-serif text-lg font-semibold text-slate-900 group-hover:text-blue-700">
                        {r.frontmatter.title}
                      </p>
                      <p className="mt-2 font-sans text-sm text-slate-600">
                        {r.frontmatter.description}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        {/* SIDEBAR — sticky TOC on desktop */}
        {toc.length > 1 && (
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
                On this page
              </p>
              <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4 font-sans text-sm">
                {toc.map((t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="text-slate-600 hover:text-blue-600 hover:underline"
                    >
                      {t.text}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
