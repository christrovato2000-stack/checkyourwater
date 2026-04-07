import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "CheckYourWater is a free, open-source public service tool that translates EPA UCMR 5 PFAS testing data into letter grades and plain-language explanations for residents.",
  alternates: { canonical: "https://checkyourwater.org/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
        About CheckYourWater
      </h1>

      <Section heading="What this is">
        <p>
          CheckYourWater is a free, open-source public service tool that shows
          Americans what PFAS &ldquo;forever chemicals&rdquo; are in their
          drinking water. We use data from the EPA&rsquo;s Unregulated
          Contaminant Monitoring Rule (UCMR 5) — the most comprehensive PFAS
          testing program ever conducted in the United States, covering over
          10,000 water systems.
        </p>
      </Section>

      <Section heading="Why this exists">
        <p>
          The EPA has collected extensive PFAS testing data, but accessing it
          requires navigating technical databases designed for regulators, not
          residents. CheckYourWater translates this data into letter grades,
          plain-language explanations, and actionable next steps — so anyone
          can understand what&rsquo;s in their water in seconds, not hours.
        </p>
      </Section>

      <Section heading="How we&rsquo;re different">
        <p>
          Unlike advocacy databases that use proprietary health guidelines,
          CheckYourWater uses the EPA&rsquo;s own Maximum Contaminant Levels
          (MCLs) — the legally enforceable federal standards. Our grading
          algorithm is open source, so anyone can verify how grades are
          calculated. We have no ads, no donation prompts, no sponsored
          content, and no commercial partnerships.
        </p>
      </Section>

      <Section heading="Data sources">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <a
              href="https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EPA UCMR 5 Occurrence Data
            </a>
          </li>
          <li>
            <a
              href="https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              EPA Safe Drinking Water Information System (SDWIS)
            </a>
          </li>
          <li>
            <a
              href="https://pubchem.ncbi.nlm.nih.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              PubChem chemical database
            </a>
          </li>
        </ul>
        <p className="mt-3 italic">
          All data is from federal government sources and is in the public
          domain.
        </p>
      </Section>

      <Section heading="Limitations">
        <p>This tool has important limitations:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Data reflects testing conducted between 2023 and 2026 and may not
            represent current water quality.
          </li>
          <li>
            Not all water systems were tested — smaller systems serving fewer
            than 3,300 people and private wells are generally not included.
          </li>
          <li>
            PFAS is just one category of drinking water contaminant. A good
            PFAS grade does not mean water is free of all contaminants.
          </li>
          <li>
            This tool provides information, not medical advice. Consult a
            healthcare provider for personal health concerns related to PFAS
            exposure.
          </li>
        </ul>
      </Section>

      <Section heading="Who built this">
        <p>
          CheckYourWater was built by Chris Trovato, an independent developer
          in San Diego, California. This is a personal public service project,
          not a commercial product. It is not affiliated with the EPA, any
          water utility, or any advocacy organization.
        </p>
      </Section>

      <Section heading="Open source">
        <p>
          The complete source code for CheckYourWater is available on{" "}
          <a
            href="https://github.com/checkyourwater/checkyourwater"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            GitHub
          </a>
          . The grading algorithm, data pipeline, and every line of code can be
          inspected, audited, and improved by anyone.
        </p>
      </Section>

      <Section heading="Contact">
        <ul className="space-y-2">
          <li>
            For press inquiries:{" "}
            <a
              href="mailto:press@checkyourwater.org"
              className="text-blue-600 hover:underline"
            >
              press@checkyourwater.org
            </a>
          </li>
          <li>
            For general questions:{" "}
            <a
              href="mailto:hello@checkyourwater.org"
              className="text-blue-600 hover:underline"
            >
              hello@checkyourwater.org
            </a>
          </li>
          <li>
            For data corrections:{" "}
            <a
              href="mailto:data@checkyourwater.org"
              className="text-blue-600 hover:underline"
            >
              data@checkyourwater.org
            </a>
          </li>
        </ul>
      </Section>

      <p className="mt-12 font-sans text-sm text-slate-600">
        Want to know how grades are calculated?{" "}
        <Link
          href="/methodology"
          className="font-semibold text-blue-600 hover:underline"
        >
          Read our methodology →
        </Link>
      </p>
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
    <section className="mt-10">
      <h2 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
        {children}
      </div>
    </section>
  );
}
