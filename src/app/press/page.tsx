import type { Metadata } from "next";
import Link from "next/link";
import { supabasePublic } from "@/lib/supabase";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Press and Citation Guide",
  description:
    "Citation guidelines, embeddable widgets, downloadable reports, and methodology for journalists covering PFAS in drinking water.",
  alternates: { canonical: "https://checkyourwater.org/press" },
};

const SECTIONS = [
  { id: "about", label: "About this project" },
  { id: "cite", label: "How to cite us" },
  { id: "methodology", label: "Methodology" },
  { id: "embed", label: "Embed our data" },
  { id: "reports", label: "Download reports" },
  { id: "assets", label: "Downloadable assets" },
  { id: "contact", label: "Contact" },
];

const PREVIEW_PWSID = "WV3302813"; // Lubeck PSD

interface GradeCount {
  grade: string;
  count: number;
}

async function getGradeDistribution(): Promise<{
  total: number;
  rows: GradeCount[];
}> {
  const grades = ["A", "B", "C", "D", "F"];
  const rows: GradeCount[] = [];
  let total = 0;
  for (const g of grades) {
    try {
      const { count } = await supabasePublic
        .from("water_systems")
        .select("pwsid", { count: "exact", head: true })
        .eq("grade", g);
      const c = count ?? 0;
      rows.push({ grade: g, count: c });
      total += c;
    } catch {
      rows.push({ grade: g, count: 0 });
    }
  }
  return { rows, total };
}

function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

export default async function PressPage() {
  const { rows: gradeRows, total: gradeTotal } = await getGradeDistribution();
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const exampleCitation = `CheckYourWater. (2026). Water Quality Report Card: Lubeck Public Service District. Retrieved ${today} from https://checkyourwater.org/system/${PREVIEW_PWSID}`;

  const embedCode = `<iframe src="https://checkyourwater.org/embed/${PREVIEW_PWSID}" width="100%" height="300" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;" title="PFAS water quality data"></iframe>`;

  return (
    <article className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p className="font-sans text-sm uppercase tracking-widest text-slate-500">
          For journalists
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Press and citation guide
        </h1>
        <p className="mt-4 max-w-2xl font-serif text-xl leading-snug text-slate-700">
          Everything a reporter on deadline needs to cite our data, embed
          our widgets, or learn how the grades are calculated.
        </p>
      </header>

      <nav
        aria-label="On this page"
        className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-5"
      >
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
          On this page
        </p>
        <ul className="mt-3 grid gap-2 font-sans text-sm sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-blue-700 hover:underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* SECTION 1 */}
      <section id="about" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          About this project
        </h2>
        <div className="prose-cyw mt-6 space-y-4 font-serif text-lg leading-relaxed text-slate-800">
          <p>
            CheckYourWater is a free, open-source public service tool that
            grades every public water system in the United States for PFAS
            contamination using official EPA testing data. Anyone can search
            by zip code to find the grade for their own water.
          </p>
          <p>
            The data comes from the EPA Unregulated Contaminant Monitoring
            Rule, fifth cycle (UCMR 5), which tested over 10,000 public
            water systems for 29 PFAS compounds between 2023 and 2025. We
            assign letter grades from A through F based on detected levels
            relative to the EPA enforceable limits finalized in April 2024.
          </p>
          <p>
            CheckYourWater is not affiliated with the EPA, any other
            government agency, any water utility, or any chemical
            manufacturer. The project receives no industry funding.
          </p>
        </div>
      </section>

      {/* SECTION 2 */}
      <section id="cite" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          How to cite us
        </h2>
        <div className="mt-6 space-y-5 rounded-lg border border-slate-200 bg-white p-6 font-sans text-sm leading-relaxed">
          <CiteRow
            label="In-text"
            value={`"according to CheckYourWater.org, which analyzed EPA testing data"`}
          />
          <CiteRow label="Full citation" value={exampleCitation} />
          <CiteRow
            label="Data attribution"
            value={`"Source: EPA UCMR 5 data via CheckYourWater.org"`}
          />
        </div>
        <p className="mt-4 font-sans text-sm leading-relaxed text-slate-600">
          We encourage journalists to verify our data against EPA&rsquo;s
          original UCMR 5 results. Our methodology is documented at{" "}
          <Link
            href="/methodology"
            className="text-blue-700 hover:underline"
          >
            checkyourwater.org/methodology
          </Link>
          .
        </p>
      </section>

      {/* SECTION 3 */}
      <section id="methodology" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Our methodology
        </h2>
        <div className="prose-cyw mt-6 space-y-4 font-serif text-lg leading-relaxed text-slate-800">
          <p>
            Every grade is calculated from a single data source: the EPA
            UCMR 5 occurrence data file. For each water system we identify
            the worst single compound result across the testing period and
            compare it to the federal Maximum Contaminant Level (MCL) for
            that compound.
          </p>
          <ul className="ml-5 list-disc space-y-2 font-sans text-base">
            <li>
              <strong>A:</strong> No PFAS compounds detected above the
              Minimum Reporting Level.
            </li>
            <li>
              <strong>B:</strong> PFAS detected, all results below 50% of
              the federal MCL.
            </li>
            <li>
              <strong>C:</strong> Worst compound between 50% and 100% of
              the federal MCL.
            </li>
            <li>
              <strong>D:</strong> At least one compound above the federal
              MCL, up to five times the limit.
            </li>
            <li>
              <strong>F:</strong> At least one compound more than five
              times the federal MCL.
            </li>
          </ul>
          <p className="font-sans text-base">
            <Link
              href="/methodology"
              className="font-semibold text-blue-700 hover:underline"
            >
              Read the full methodology, including known limitations &rarr;
            </Link>
          </p>
        </div>
      </section>

      {/* SECTION 4 */}
      <section id="embed" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Embed our data
        </h2>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
          Drop this snippet into any web page or article. The embed
          updates automatically when new data is available.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
          <code>{embedCode}</code>
        </pre>
        <p className="mt-6 font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
          Live preview
        </p>
        <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white">
          <iframe
            src={`/embed/${PREVIEW_PWSID}`}
            width="100%"
            height={300}
            title="PFAS water quality data sample"
            style={{ border: "none", display: "block" }}
          />
        </div>
      </section>

      {/* SECTION 5 */}
      <section id="reports" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Download reports
        </h2>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
          Every system page offers a one-page printable PDF report card.
          City pages produce a multi-page report covering every system
          serving the city. The reports are designed to be handed out at
          public meetings or attached to a story.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 font-sans text-sm">
          <a
            href={`/api/report/${PREVIEW_PWSID}`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
          >
            Example system PDF (Lubeck PSD)
          </a>
          <a
            href="/api/report/city/parkersburg-wv"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700"
          >
            Example city PDF (Parkersburg, WV)
          </a>
        </div>
      </section>

      {/* SECTION 6 */}
      <section id="assets" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Downloadable assets
        </h2>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
          Grade distribution across the {gradeTotal.toLocaleString("en-US")}{" "}
          public water systems we have graded from EPA UCMR 5 data:
        </p>
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full font-sans text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Grade
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Systems
                </th>
                <th scope="col" className="px-4 py-2 font-semibold">
                  Share
                </th>
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {gradeRows.map((r) => (
                <tr key={r.grade} className="border-t border-slate-100">
                  <th
                    scope="row"
                    className="px-4 py-2 font-semibold text-slate-900"
                  >
                    {r.grade}
                  </th>
                  <td className="px-4 py-2 tabular-nums">
                    {r.count.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {pct(r.count, gradeTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 font-sans text-xs italic text-slate-500">
          {/* TODO: add a downloadable national grade distribution map PNG. */}
          Numbers are pulled live from the database.
        </p>
      </section>

      {/* SECTION 7 */}
      <section id="contact" className="mt-16 scroll-mt-20">
        <h2 className="font-serif text-3xl font-bold text-slate-900">
          Contact
        </h2>
        <p className="mt-4 font-serif text-lg leading-relaxed text-slate-800">
          For press inquiries:{" "}
          <a
            href="mailto:hello@checkyourwater.org"
            className="text-blue-700 hover:underline"
          >
            hello@checkyourwater.org
          </a>
        </p>
      </section>
    </article>
  );
}

function CiteRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm leading-relaxed text-slate-800">
        {value}
      </p>
    </div>
  );
}
