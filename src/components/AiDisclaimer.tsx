/**
 * Standardized disclaimer shown alongside any AI-generated narrative content.
 * Used on city and system pages.
 */
export default function AiDisclaimer() {
  return (
    <p className="mt-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 font-sans text-xs leading-relaxed text-slate-600">
      <strong className="font-semibold text-slate-700">
        About this summary:
      </strong>{" "}
      Narrative text on this page was drafted by an AI model
      (claude-sonnet-4-6) from EPA UCMR 5 data and reviewed before publication.
      The numeric data above is reported by water utilities directly to the
      EPA. If you spot an error, email{" "}
      <a
        href="mailto:data@checkyourwater.org"
        className="text-blue-600 hover:underline"
      >
        data@checkyourwater.org
      </a>
      .
    </p>
  );
}
