import Link from "next/link";

const NAV_LINKS = [
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/action", label: "What Can I Do" },
];

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
        >
          Check<span className="text-blue-600">Your</span>Water
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 font-sans text-sm text-slate-600 md:flex"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="transition-colors hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
