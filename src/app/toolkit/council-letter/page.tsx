import type { Metadata } from "next";
import ToolkitBreadcrumbs from "@/components/ToolkitBreadcrumbs";
import ToolkitMoreResources from "@/components/ToolkitMoreResources";
import CopyToClipboardButton from "@/components/CopyToClipboardButton";
import { COUNCIL_LETTER_TEMPLATE } from "@/lib/toolkitTemplates";

export const metadata: Metadata = {
  title:
    "Letter Template: PFAS in Your Drinking Water | CheckYourWater Toolkit",
  description:
    "A free, customizable letter template you can send to your city council or water board about PFAS contamination. Includes placeholders for your local CheckYourWater data.",
  alternates: {
    canonical: "https://checkyourwater.org/toolkit/council-letter",
  },
};

export default function CouncilLetterPage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <ToolkitBreadcrumbs current="City Council Letter" />

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        Letter Template: PFAS in Your Drinking Water
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
        Use this template to contact your city council or water board about
        PFAS contamination in your water system. Fill in the bracketed fields
        with your information and your local data from CheckYourWater.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/toolkit/pdfs/council-letter.pdf"
          download
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-blue-700"
        >
          Download as PDF
        </a>
        <CopyToClipboardButton text={COUNCIL_LETTER_TEMPLATE} />
      </div>

      <pre className="mt-8 overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-6 font-serif text-base leading-relaxed text-slate-900">
        {COUNCIL_LETTER_TEMPLATE}
      </pre>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
          How to use this letter
        </h2>
        <div className="mt-4 space-y-4 font-serif text-lg leading-relaxed text-slate-800">
          <p>
            Find your water system&rsquo;s data at checkyourwater.org by
            entering your zip code. The system page shows the exact compound
            names, detected levels, and EPA limits you&rsquo;ll need to fill in
            the bracketed fields.
          </p>
          <p>
            Send the letter to every council member individually, not just to a
            general inbox. Individual emails get more attention than mass
            messages. Find your council members&rsquo; contact information on
            your city&rsquo;s website.
          </p>
          <p>
            Attach the PDF report card from CheckYourWater (download it from
            your system&rsquo;s page). Having the data in a printable format
            makes it harder to ignore.
          </p>
          <p>
            Send copies to your local newspaper&rsquo;s city hall reporter and
            your state representative. Public pressure from multiple directions
            is more effective than a single letter.
          </p>
          <p>
            Follow up in two weeks if you don&rsquo;t receive a response.
            Reference your original letter by date.
          </p>
        </div>
      </section>

      <ToolkitMoreResources currentSlug="council-letter" />
    </main>
  );
}
