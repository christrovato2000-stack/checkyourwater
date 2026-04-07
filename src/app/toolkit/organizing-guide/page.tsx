import type { Metadata } from "next";
import Link from "next/link";
import ToolkitBreadcrumbs from "@/components/ToolkitBreadcrumbs";
import ToolkitMoreResources from "@/components/ToolkitMoreResources";

export const metadata: Metadata = {
  title:
    "Community Organizing Guide: Responding to PFAS Contamination | CheckYourWater Toolkit",
  description:
    "A four-week step-by-step guide for residents who want to organize their community around PFAS contamination, from first discovery to sustained advocacy.",
  alternates: {
    canonical: "https://checkyourwater.org/toolkit/organizing-guide",
  },
};

export default function OrganizingGuidePage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <ToolkitBreadcrumbs current="Community Organizing Guide" />

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        Community Organizing Guide: Responding to PFAS Contamination
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
        A practical four-week plan to take you from discovering PFAS in your
        water to building a community group that can sustain pressure for
        years.
      </p>

      <Section heading="Week 1: Research and understand">
        <p>
          Search your zip code at{" "}
          <Link href="/" className="text-blue-700 hover:underline">
            CheckYourWater.org
          </Link>
          . Download the PDF report card.
        </p>
        <p>
          Read the full system detail page. Note which compounds were
          detected, their levels vs limits, and how many people your system
          serves.
        </p>
        <p>
          If your city has an investigation article on CheckYourWater, read it
          for historical context.
        </p>
        <p>
          Check your{" "}
          <Link href="/states" className="text-blue-700 hover:underline">
            state&rsquo;s page
          </Link>{" "}
          on CheckYourWater to see how your community compares to others in
          the state.
        </p>
      </Section>

      <Section heading="Week 2: Connect and build">
        <p>
          Share the CheckYourWater report with 5 to 10 neighbors, friends, or
          parents at your child&rsquo;s school. Ask if they knew about the
          testing results.
        </p>
        <p>
          Start a group chat or email thread with interested neighbors. Even 3
          to 5 committed people is enough to start.
        </p>
        <p>
          Find out when your city council and water board next meet. Look up
          your council members&rsquo; names and contact information.
        </p>
      </Section>

      <Section heading="Week 3: Go public">
        <p>
          Send the city council letter (use our{" "}
          <Link
            href="/toolkit/council-letter"
            className="text-blue-700 hover:underline"
          >
            template
          </Link>
          ). Send it individually to each council member.
        </p>
        <p>
          File a public records request with your water utility (use our{" "}
          <Link
            href="/toolkit/records-request"
            className="text-blue-700 hover:underline"
          >
            template
          </Link>
          ).
        </p>
        <p>
          Attend the next council or water board meeting. Bring your group.
          Use our{" "}
          <Link
            href="/toolkit/meeting-guide"
            className="text-blue-700 hover:underline"
          >
            speaking guide
          </Link>
          .
        </p>
        <p>
          Contact your local newspaper. A reporter covering city hall will be
          interested in residents raising PFAS concerns.
        </p>
      </Section>

      <Section heading="Week 4 and beyond: Sustain pressure">
        <p>
          Follow up on your records request if you haven&rsquo;t received a
          response.
        </p>
        <p>
          Follow up with council members who haven&rsquo;t responded to your
          letter.
        </p>
        <p>
          Attend subsequent meetings. Ask for updates on treatment plans,
          timelines, and costs.
        </p>
        <p>
          Share updates with your group and with CheckYourWater (email
          hello@checkyourwater.org) so we can add them to the city&rsquo;s
          &ldquo;What Happened Next&rdquo; timeline.
        </p>
        <p>
          Connect with statewide environmental groups who may be working on
          PFAS legislation.
        </p>
      </Section>

      <Section heading="Setting expectations">
        <p>
          Municipal water treatment projects typically take 2 to 5 years from
          decision to completion. Treatment technologies (granular activated
          carbon, reverse osmosis, ion exchange) are proven but require capital
          investment, engineering design, and construction.
        </p>
        <p>
          The federal compliance deadline is 2029. That means your utility is
          required to have treatment in place by then. Your advocacy can
          accelerate that timeline and ensure your community isn&rsquo;t left
          waiting until the last possible moment.
        </p>
        <p>
          Persistence matters more than perfection. Showing up consistently,
          at meetings, in emails, in the local paper, is what moves municipal
          government.
        </p>
      </Section>

      <ToolkitMoreResources currentSlug="organizing-guide" />
    </main>
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
      <div className="mt-4 space-y-4 font-serif text-lg leading-relaxed text-slate-800">
        {children}
      </div>
    </section>
  );
}
