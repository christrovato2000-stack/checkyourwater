import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/action", label: "What Can I Do" },
  { href: "#github", label: "GitHub" },
];

export default function Footer() {
  const lastUpdated = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return (
    <footer className="mt-24 border-t border-slate-200 bg-slate-50 font-sans text-sm text-slate-600">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="max-w-xs">
          <p className="font-serif text-base font-semibold text-slate-900">
            CheckYourWater.org
          </p>
          <p className="mt-2 leading-relaxed">
            A free, open-source public service tool. Not affiliated with the
            EPA or any government agency.
          </p>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Explore
          </p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-slate-900">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Data
          </p>
          <p className="mt-3 leading-relaxed">
            Source: EPA UCMR 5 (2023&ndash;2026)
            <br />
            Last updated: {lastUpdated}
          </p>
          <p className="mt-3">
            Contact:{" "}
            <a
              href="mailto:hello@checkyourwater.org"
              className="text-blue-600 hover:underline"
            >
              hello@checkyourwater.org
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Built by Chris Trovato.
      </div>
    </footer>
  );
}
