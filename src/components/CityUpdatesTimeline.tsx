import {
  cityUpdateBadgeClasses,
  cityUpdateCategoryLabel,
  formatUpdateMonth,
} from "@/lib/cityUpdates";
import type { CityUpdate } from "@/types/database";

export default function CityUpdatesTimeline({
  cityName,
  updates,
}: {
  cityName: string;
  updates: CityUpdate[];
}) {
  if (updates.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-3xl font-bold text-slate-900">
        What happened next in {cityName}
      </h2>
      <p className="mt-2 max-w-[720px] font-sans text-base text-slate-600">
        A running record of how government, utilities, and the community have
        responded since this data went public.
      </p>

      <ol className="mt-8 relative border-l-2 border-slate-200 pl-6">
        {updates.map((u) => (
          <li key={u.id} className="relative pb-10 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-blue-600 ring-2 ring-blue-200"
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`rounded-full px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wide ${cityUpdateBadgeClasses(u.category)}`}
              >
                {cityUpdateCategoryLabel(u.category)}
              </span>
              <time
                dateTime={u.update_date}
                className="font-sans text-xs uppercase tracking-widest text-slate-500"
              >
                {formatUpdateMonth(u.update_date)}
              </time>
            </div>
            <h3 className="mt-2 font-serif text-xl font-semibold text-slate-900">
              {u.title}
            </h3>
            <p className="mt-2 font-sans text-base leading-relaxed text-slate-700">
              {u.description}
            </p>
            {u.source_url && (
              <p className="mt-2 font-sans text-sm">
                <a
                  href={u.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-700 hover:underline"
                >
                  {u.source_name ?? "Source"} →
                </a>
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
