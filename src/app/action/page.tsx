import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What You Can Do About PFAS in Your Water",
  description:
    "Practical, specific steps for residents who want to reduce PFAS exposure: certified water filters, requesting your CCR, independent testing, contacting officials, and more.",
  alternates: { canonical: "https://checkyourwater.org/action" },
};

export default function ActionPage() {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
        What You Can Do
      </h1>
      <p className="mt-4 font-serif text-xl leading-snug text-slate-700">
        If PFAS has been detected in your water, here are specific steps you
        can take.
      </p>

      <Section heading="1. Water filters that remove PFAS">
        <p>
          Not all water filters remove PFAS. Look for filters certified to
          NSF/ANSI Standard 53 or 58 for PFAS reduction.
        </p>

        <div className="mt-5 space-y-5">
          <FilterCard
            name="Reverse Osmosis (RO)"
            blurb="Most effective for PFAS removal (>90% reduction for most compounds). Under-sink systems cost $150–$400. Requires filter replacement every 6–12 months."
          />
          <FilterCard
            name="Activated Carbon (GAC)"
            blurb="Effective for longer-chain PFAS like PFOA and PFOS (60–95% reduction). Pitcher filters ($20–$40) or faucet-mount systems ($20–$60). Less effective for shorter-chain PFAS like GenX."
          />
          <FilterCard
            name="Ion Exchange"
            blurb="Effective for some PFAS compounds. Typically whole-house systems ($1,000–$3,000). Best for well water with known contamination."
          />
        </div>

        <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 font-sans text-sm font-medium text-amber-900">
          Important: Boiling water does NOT remove PFAS. It may actually
          concentrate them.
        </p>

        <p className="mt-4">
          Look for the NSF certification mark on any filter you purchase. NSF
          maintains a searchable database of certified products at{" "}
          <a
            href="https://www.nsf.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            nsf.org
          </a>
          .
        </p>
      </Section>

      <Section heading="2. Request your water quality report">
        <p>
          Your water utility is required to provide an annual Consumer
          Confidence Report (CCR) to all customers. This report details what
          was found in your water.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Contact your water utility and request the most recent CCR</li>
          <li>Ask specifically about PFAS testing results</li>
          <li>
            If your utility has not tested for PFAS, ask when they plan to
          </li>
          <li>
            CCRs are often available on your utility&rsquo;s website or at{" "}
            <a
              href="https://www.epa.gov/ccr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              epa.gov/ccr
            </a>
          </li>
        </ul>
      </Section>

      <Section heading="3. Get independent testing">
        <p>
          If you want to test your own water (especially if you&rsquo;re on a
          private well):
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <a
              href="https://mytapscore.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Tap Score (mytapscore.com)
            </a>{" "}
            — PFAS test kits starting at ~$300
          </li>
          <li>SimpleLab — mail-in water testing</li>
          <li>
            Contact your state health department for local testing options
          </li>
          <li>
            Some states offer free or subsidized PFAS testing for private well
            owners
          </li>
        </ul>
      </Section>

      <Section heading="4. Contact your elected officials">
        <p>
          Your representatives need to hear from constituents about PFAS
          contamination.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Find your US Representative:{" "}
            <a
              href="https://www.house.gov/representatives/find-your-representative"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              house.gov
            </a>
          </li>
          <li>
            Find your US Senators:{" "}
            <a
              href="https://www.senate.gov/senators/senators-contact.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              senate.gov
            </a>
          </li>
          <li>
            Find your state legislators: search &ldquo;[your state] state
            legislature&rdquo;
          </li>
          <li>
            Attend a city council or county commission meeting and raise the
            issue during public comment
          </li>
        </ul>
      </Section>

      <Section heading="5. Connect with your community">
        <p>
          Many communities affected by PFAS contamination have organized
          advocacy groups. Connecting with neighbors who share your concerns
          can amplify your voice.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Search for PFAS community groups in your area on Facebook</li>
          <li>
            The{" "}
            <a
              href="https://pfasproject.net/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              National PFAS Contamination Coalition
            </a>{" "}
            connects affected communities across the country
          </li>
          <li>
            Your state environmental agency may have a PFAS program with
            community resources
          </li>
        </ul>
      </Section>

      <Section heading="6. Reduce PFAS exposure beyond water">
        <p>
          While drinking water is a major exposure pathway, you can also reduce
          PFAS exposure from other sources:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Avoid non-stick cookware (choose cast iron, stainless steel, or
            ceramic)
          </li>
          <li>Choose PFAS-free food packaging when possible</li>
          <li>
            Look for PFAS-free clothing and textiles (avoid
            &ldquo;stain-resistant&rdquo; or &ldquo;water-resistant&rdquo;
            treatments)
          </li>
          <li>
            Avoid microwave popcorn bags and fast-food wrappers, which often
            contain PFAS
          </li>
        </ul>
      </Section>
    </article>
  );
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
        {children}
      </div>
    </section>
  );
}

function FilterCard({ name, blurb }: { name: string; blurb: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="font-serif text-xl font-semibold text-slate-900">
        {name}
      </h3>
      <p className="mt-2 font-sans text-base leading-relaxed text-slate-700">
        {blurb}
      </p>
    </div>
  );
}
