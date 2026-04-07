import Link from "next/link";
import ZipSearch from "@/components/ZipSearch";

export const metadata = {
  title: "Page not found",
  description:
    "The page you're looking for doesn't exist. Search by zip code to find PFAS data for your water system.",
};

export default function NotFound() {
  return (
    <section className="mx-auto max-w-[720px] px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
          404
        </p>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
          The page you&rsquo;re looking for doesn&rsquo;t exist. Try searching
          by zip code to find PFAS data for your water system.
        </p>
      </div>

      <div className="mt-10">
        <ZipSearch />
      </div>

      <p className="mt-10 text-center font-sans text-sm text-slate-600">
        Or{" "}
        <Link
          href="/"
          className="font-semibold text-blue-600 hover:underline"
        >
          return to the homepage
        </Link>
        .
      </p>
    </section>
  );
}
