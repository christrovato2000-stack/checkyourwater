import Link from "next/link";
import { otherToolkitResources } from "@/lib/toolkit";

export default function ToolkitMoreResources({
  currentSlug,
}: {
  currentSlug: string;
}) {
  const others = otherToolkitResources(currentSlug);
  return (
    <aside className="mt-16 rounded-lg border border-slate-200 bg-slate-50 p-6">
      <h2 className="font-serif text-xl font-semibold text-slate-900">
        More resources
      </h2>
      <ul className="mt-4 space-y-3 font-sans text-base">
        {others.map((r) => (
          <li key={r.slug}>
            <Link
              href={r.href}
              className="font-semibold text-blue-700 hover:underline"
            >
              {r.cardTitle}
            </Link>
            <p className="mt-1 text-sm text-slate-600">{r.blurb}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
