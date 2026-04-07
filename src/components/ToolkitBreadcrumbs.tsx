import Link from "next/link";

export default function ToolkitBreadcrumbs({
  current,
}: {
  current?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="font-sans text-xs uppercase tracking-widest text-slate-500"
    >
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          {current ? (
            <Link href="/toolkit" className="hover:text-slate-900">
              Toolkit
            </Link>
          ) : (
            <span className="text-slate-700">Toolkit</span>
          )}
        </li>
        {current && (
          <>
            <li aria-hidden="true">/</li>
            <li className="text-slate-700">{current}</li>
          </>
        )}
      </ol>
    </nav>
  );
}
