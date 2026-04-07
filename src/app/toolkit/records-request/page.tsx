import type { Metadata } from "next";
import ToolkitBreadcrumbs from "@/components/ToolkitBreadcrumbs";
import ToolkitMoreResources from "@/components/ToolkitMoreResources";
import CopyToClipboardButton from "@/components/CopyToClipboardButton";
import { RECORDS_REQUEST_TEMPLATE } from "@/lib/toolkitTemplates";

export const metadata: Metadata = {
  title:
    "Public Records Request Template: PFAS Testing Data | CheckYourWater Toolkit",
  description:
    "A free public records request template for PFAS testing data, treatment plans, and EPA communications. Customize for your state and water utility.",
  alternates: {
    canonical: "https://checkyourwater.org/toolkit/records-request",
  },
};

export default function RecordsRequestPage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <ToolkitBreadcrumbs current="Public Records Request" />

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        Public Records Request Template: PFAS Testing Data
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
        Every state has a public records law that gives you the right to
        request documents from your water utility. Use this template to request
        PFAS-related records.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <a
          href="/toolkit/pdfs/records-request.pdf"
          download
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 font-sans text-sm font-semibold text-white hover:bg-blue-700"
        >
          Download as PDF
        </a>
        <CopyToClipboardButton text={RECORDS_REQUEST_TEMPLATE} />
      </div>

      <pre className="mt-8 overflow-x-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-6 font-serif text-base leading-relaxed text-slate-900">
        {RECORDS_REQUEST_TEMPLATE}
      </pre>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
          Tips for filing public records requests
        </h2>
        <div className="mt-4 space-y-4 font-serif text-lg leading-relaxed text-slate-800">
          <p>
            Submit your request in writing (email is fine in most states). Keep
            a copy with the date you sent it.
          </p>
          <p>
            Most states require a response within 5 to 10 business days, though
            the timeline varies. If you don&rsquo;t hear back, follow up citing
            the statutory deadline.
          </p>
          <p>
            If the utility claims an exemption and withholds records, you can
            appeal. Many states have an ombudsman or attorney general&rsquo;s
            office that handles records disputes.
          </p>
          <p>
            You may be charged for copying costs. Ask for electronic copies to
            minimize fees.
          </p>
          <p>
            Consider sending the same request to your state environmental
            agency, which may have additional PFAS data from state monitoring
            programs.
          </p>
        </div>
      </section>

      <ToolkitMoreResources currentSlug="records-request" />
    </main>
  );
}
