import type { Metadata } from "next";
import ToolkitBreadcrumbs from "@/components/ToolkitBreadcrumbs";
import ToolkitMoreResources from "@/components/ToolkitMoreResources";

export const metadata: Metadata = {
  title:
    "How to Speak at a City Council Meeting About PFAS | CheckYourWater Toolkit",
  description:
    "A step-by-step guide for preparing a 3-minute public comment about PFAS contamination in your drinking water. Includes a sample script.",
  alternates: {
    canonical: "https://checkyourwater.org/toolkit/meeting-guide",
  },
};

export default function MeetingGuidePage() {
  return (
    <main className="mx-auto max-w-[860px] px-4 py-12 sm:px-6 sm:py-16">
      <ToolkitBreadcrumbs current="Public Meeting Guide" />

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
        How to Speak at a City Council Meeting About PFAS
      </h1>
      <p className="mt-4 font-serif text-lg leading-relaxed text-slate-700">
        A short, well-prepared public comment can move a council more than a
        dozen emails. Here is how to prepare one.
      </p>

      <Section heading="Before the meeting">
        <p>
          Find your city council or water board&rsquo;s meeting schedule on the
          city website. Most have a public comment period at the beginning or
          end of each meeting. Some require you to sign up in advance.
        </p>
        <p>
          Write out what you plan to say. Public comment periods are typically
          2 to 3 minutes. That&rsquo;s about 350 to 400 words. Practice timing
          yourself.
        </p>
        <p>
          Print copies of the CheckYourWater PDF report card for your water
          system. Bring enough for every council member plus a few extra.
        </p>
        <p>
          If possible, bring neighbors. Numbers matter. Even if they
          don&rsquo;t speak, having 5 to 10 people stand up when you&rsquo;re
          introduced shows this isn&rsquo;t just one person&rsquo;s concern.
        </p>
      </Section>

      <Section heading="What to say">
        <p>
          Open with who you are: &ldquo;My name is [name], I live in
          [neighborhood/district], and I&rsquo;m a customer of [water system
          name].&rdquo;
        </p>
        <p>
          State the facts: &ldquo;According to EPA testing data, our water
          system tested positive for [compound] at [X] times the federal
          limit.&rdquo;
        </p>
        <p>
          Make a specific ask: &ldquo;I&rsquo;m asking the council to [specific
          action: issue a public statement, commission a treatment study,
          provide interim guidance to residents].&rdquo;
        </p>
        <p>
          Close with stakes: &ldquo;This affects [population number] residents,
          including families with young children. I&rsquo;d like to know what
          the council plans to do and when.&rdquo;
        </p>

        <div className="mt-6 rounded-lg border-l-4 border-blue-600 bg-blue-50 px-5 py-5">
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-blue-700">
            Example script
          </p>
          <p className="mt-3 font-serif text-base leading-relaxed text-slate-900">
            &ldquo;Good evening. My name is [name], I live in [neighborhood],
            and I&rsquo;ve been a resident for [X] years. I&rsquo;m here
            because EPA testing data shows that our water system, [system
            name], has [compound] in our drinking water at [X] times the
            federal safety limit. I&rsquo;ve brought copies of the test data
            for each of you. [Pause to hand them out.] The EPA set these
            limits in 2024 after years of research showing that PFAS exposure
            increases cancer risk and affects immune function. Our water
            exceeds those limits today. I&rsquo;m asking the council to do
            three things: first, publicly acknowledge these test results and
            communicate them to residents. Second, direct the water utility to
            develop a treatment plan with a timeline. Third, provide guidance
            to families, especially those with infants, on how to reduce
            exposure while we wait for treatment. I&rsquo;m happy to work with
            any council member on this. Thank you.&rdquo;
          </p>
        </div>
      </Section>

      <Section heading="What NOT to do">
        <p>
          Don&rsquo;t speculate about health effects beyond what the science
          supports. Stick to &ldquo;the EPA determined these levels pose health
          risks&rdquo; rather than claiming specific illnesses.
        </p>
        <p>
          Don&rsquo;t attack individual council members or utility staff.
          They&rsquo;re more likely to act if they feel you&rsquo;re working
          with them, not against them.
        </p>
        <p>
          Don&rsquo;t make it partisan. PFAS contamination affects everyone
          regardless of political affiliation. Keep the focus on public health
          and data.
        </p>
        <p>
          Don&rsquo;t expect immediate action. Municipal processes are slow.
          The goal of the first meeting is to get the issue on the record and
          establish yourself as a constituent who will follow up.
        </p>
      </Section>

      <Section heading="After the meeting">
        <p>
          Send a follow-up email to each council member thanking them for
          their time and reiterating your specific requests. Attach the PDF
          report card again.
        </p>
        <p>
          If the meeting was recorded or minutes are taken, request copies.
        </p>
        <p>
          Set a calendar reminder to attend the next meeting and ask for an
          update.
        </p>
        <p>
          Contact your local newspaper&rsquo;s city hall reporter. A story
          about residents raising PFAS concerns at a council meeting creates
          public pressure that sustains momentum between meetings.
        </p>
      </Section>

      <ToolkitMoreResources currentSlug="meeting-guide" />
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
