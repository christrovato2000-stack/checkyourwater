"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Renders inside the root layout, so the nav
 * and footer remain visible, giving the user a path forward instead of a
 * dead end. Technical details are logged to the console (and can be
 * forwarded to Sentry once the DSN is configured) but never shown to users.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
        Error
      </p>
      <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Something went wrong
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
        We hit an unexpected problem loading this page. It&rsquo;s not your
        fault. Please try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-5 py-2.5 font-sans text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          Go to homepage
        </Link>
      </div>
    </section>
  );
}
