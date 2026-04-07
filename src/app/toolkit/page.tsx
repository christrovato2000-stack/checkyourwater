import type { Metadata } from "next";
import Link from "next/link";
import InvestigationRequestForm from "@/components/InvestigationRequestForm";
import { TOOLKIT_RESOURCES, type ToolkitResource } from "@/lib/toolkit";

export const metadata: Metadata = {
  title: "Take Action on PFAS in Your Community | CheckYourWater Toolkit",
  description:
    "Free templates, guides, and resources to help you respond to PFAS contamination. Letter templates, public records requests, meeting guides, and a community organizing checklist. Download, customize, share.",
  alternates: { canonical: "https://checkyourwater.org/toolkit" },
};

export default function ToolkitLandingPage() {
  return (
    <main className="mx-auto max-w-[1000px] px-4 py-12 sm:px-6 sm:py-16">
      <header className="max-w-[760px]">
        <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Take Action on PFAS in Your Community
        </h1>
        <p className="mt-4 font-serif text-xl leading-snug text-slate-700">
          Free templates, guides, and resources to help you respond to PFAS
          contamination. Download, customize, and share.
        </p>
      </header>

      <section
        aria-label="Toolkit resources"
        className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2"
      >
        {TOOLKIT_RESOURCES.map((r) => (
          <ResourceCard key={r.slug} resource={r} />
        ))}
      </section>

      <p className="mt-10 font-sans text-sm italic text-slate-600">
        All resources are free to use, customize, and share. No attribution
        required.
      </p>

      <section className="mt-20 border-t border-slate-200 pt-12">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Don&rsquo;t see your city?
        </h2>
        <p className="mt-3 max-w-[720px] font-sans text-base leading-relaxed text-slate-700">
          If your community isn&rsquo;t covered yet, request an investigation.
          We review every submission and prioritize by population affected and
          data severity.
        </p>
        <div className="mt-6 max-w-[760px]">
          <InvestigationRequestForm />
        </div>
      </section>

      <p className="mt-12 font-sans text-sm">
        <Link href="/" className="font-semibold text-blue-700 hover:underline">
          ← Back to CheckYourWater
        </Link>
      </p>
    </main>
  );
}

function ResourceCard({ resource }: { resource: ToolkitResource }) {
  return (
    <Link
      href={resource.href}
      className="group block rounded-lg border border-slate-200 bg-white p-6 transition-colors hover:border-blue-400 hover:shadow-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <ResourceIcon icon={resource.icon} />
        </div>
        <div className="min-w-0">
          <h3 className="font-serif text-xl font-semibold text-slate-900 group-hover:text-blue-700">
            {resource.cardTitle}
          </h3>
          <p className="mt-2 font-sans text-sm leading-relaxed text-slate-600">
            {resource.blurb}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ResourceIcon({ icon }: { icon: ToolkitResource["icon"] }) {
  switch (icon) {
    case "envelope":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 5L2 7" />
        </svg>
      );
    case "document":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );
    case "megaphone":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 11 18-5v12L3 14v-3z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      );
    case "people":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
  }
}
