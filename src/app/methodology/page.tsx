import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How CheckYourWater calculates letter grades from EPA UCMR 5 PFAS testing data, including the full grading rubric and EPA Maximum Contaminant Levels.",
  alternates: { canonical: "https://checkyourwater.org/methodology" },
};

export default function MethodologyPage() {
  return (
    <article className="mx-auto max-w-[760px] px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-serif text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
        Methodology
      </h1>

      <Section heading="Data source">
        <p>
          All water quality data comes from the EPA&rsquo;s Unregulated
          Contaminant Monitoring Rule, 5th cycle (UCMR 5). Under this program,
          water systems serving more than 3,300 people and a representative
          sample of smaller systems were required to test for 30 contaminants,
          including 29 PFAS compounds, between 2023 and 2026.
        </p>
      </Section>

      <Section heading="Grading system">
        <p>
          Every water system receives a letter grade (A through F) based on
          how its PFAS levels compare to EPA Maximum Contaminant Levels (MCLs).
        </p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse font-sans text-sm">
            <caption className="sr-only">
              CheckYourWater letter grade rubric
            </caption>
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Grade
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Criteria
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <RubricRow grade="A" criteria="No PFAS detected above the Minimum Reporting Level" />
              <RubricRow grade="B" criteria="PFAS detected, but all levels below 50% of the EPA MCL" />
              <RubricRow grade="C" criteria="At least one compound between 50% and 100% of the EPA MCL" />
              <RubricRow grade="D" criteria="At least one compound exceeds the EPA MCL (up to 5×)" />
              <RubricRow grade="F" criteria="At least one compound exceeds 5× the EPA MCL" />
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          For compounds without an established MCL, grades are assigned based
          on detection count.
        </p>
      </Section>

      <Section heading="EPA Maximum Contaminant Levels">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse font-sans text-sm">
            <caption className="sr-only">
              EPA finalized PFAS Maximum Contaminant Levels (April 2024)
            </caption>
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-600">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Compound
                </th>
                <th scope="col" className="py-2 pr-4 font-semibold">
                  EPA MCL
                </th>
                <th scope="col" className="py-2 font-semibold">
                  Effective date
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              <MclRow name="PFOA" mcl="4.0 ppt" />
              <MclRow name="PFOS" mcl="4.0 ppt" />
              <MclRow name="PFHxS" mcl="10.0 ppt" />
              <MclRow name="PFNA" mcl="10.0 ppt" />
              <MclRow name="HFPO-DA (GenX)" mcl="10.0 ppt" />
              <MclRow name="Hazard Index (mixture)" mcl="1.0 (unitless)" />
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          These are the first-ever federal limits on PFAS in drinking water,
          finalized in April 2024.
        </p>
      </Section>

      <Section heading="Why EPA MCLs and not EWG guidelines?">
        <p>
          Some databases use proprietary health guidelines that are
          significantly stricter than EPA standards. We use EPA MCLs because
          they are:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            The legally enforceable federal standards that water systems must
            comply with
          </li>
          <li>Based on extensive scientific review by the EPA</li>
          <li>Transparent and publicly documented</li>
          <li>
            The standard against which compliance actions and enforcement are
            measured
          </li>
        </ul>
        <p className="mt-3">
          Using stricter proprietary guidelines would result in virtually every
          water system receiving a failing grade, which would reduce the
          tool&rsquo;s ability to distinguish between systems with genuine
          exceedances and those that meet federal requirements.
        </p>
      </Section>

      <Section heading="Concentration units">
        <p>
          All concentrations are displayed in parts per trillion (ppt),
          equivalent to nanograms per liter (ng/L). For reference: 1 part per
          trillion is approximately one drop of water in 20 Olympic swimming
          pools.
        </p>
      </Section>

      <Section heading="Data processing">
        <p>Raw UCMR 5 data is processed as follows:</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Non-detect results (samples below the Minimum Reporting Level) are
            excluded from concentration averages.
          </li>
          <li>
            For systems with multiple sampling events, concentrations are
            averaged across all detected samples.
          </li>
          <li>
            The MCL ratio is calculated as: average detected concentration ÷
            EPA MCL.
          </li>
          <li>
            Grades are assigned based on the highest MCL ratio across all
            regulated compounds.
          </li>
        </ol>
      </Section>

      <Section heading="Limitations">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Data reflects testing conducted between 2023 and 2026 and may not
            represent current water quality.
          </li>
          <li>
            Not all water systems were tested. Smaller systems serving fewer
            than 3,300 people and private wells are generally not included.
          </li>
          <li>
            PFAS is just one category of drinking water contaminant; a good
            PFAS grade does not mean water is free of all contaminants.
          </li>
          <li>
            Concentration averages may not represent peak contamination events.
          </li>
          <li>
            Some systems may have installed treatment since testing was
            conducted.
          </li>
          <li>
            The Hazard Index for PFAS mixtures is not yet incorporated into
            grading.
          </li>
        </ul>
      </Section>

      <Section heading="Open source">
        <p>
          The complete grading algorithm is available on{" "}
          <a
            href="https://github.com/christrovato2000-stack/checkyourwater"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            GitHub
          </a>
          . If you believe a grade is incorrect, please contact{" "}
          <a
            href="mailto:data@checkyourwater.org"
            className="text-blue-600 hover:underline"
          >
            data@checkyourwater.org
          </a>{" "}
          with the PWSID and your analysis.
        </p>
      </Section>

      <p className="mt-12 font-sans text-sm text-slate-600">
        Want to know more about who built this and why?{" "}
        <Link
          href="/about"
          className="font-semibold text-blue-600 hover:underline"
        >
          Read the About page →
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

function RubricRow({ grade, criteria }: { grade: string; criteria: string }) {
  return (
    <tr className="border-b border-slate-100">
      <th scope="row" className="py-2 pr-4 font-semibold">
        {grade}
      </th>
      <td className="py-2">{criteria}</td>
    </tr>
  );
}

function MclRow({ name, mcl }: { name: string; mcl: string }) {
  return (
    <tr className="border-b border-slate-100">
      <th scope="row" className="py-2 pr-4 font-semibold">
        {name}
      </th>
      <td className="py-2 pr-4 tabular-nums">{mcl}</td>
      <td className="py-2">April 2024</td>
    </tr>
  );
}
