"use client";

/**
 * Outlined "Download Report (PDF)" button used on system and city
 * pages. Shows a brief "Generating..." state while the request is
 * in flight, then triggers the browser download.
 */
import { useState } from "react";

interface Props {
  href: string;
  filename: string;
  label?: string;
}

export default function DownloadReportButton({
  href,
  filename,
  label = "Download Report (PDF)",
}: Props) {
  const [busy, setBusy] = useState(false);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fall back to a plain navigation so the user still gets the file.
      window.location.href = href;
    } finally {
      setBusy(false);
    }
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      aria-busy={busy}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-sans text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="currentColor"
        className="h-4 w-4"
      >
        <path d="M10 3a1 1 0 0 1 1 1v7.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 11.586V4a1 1 0 0 1 1-1Z" />
        <path d="M3 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
      </svg>
      {busy ? "Generating..." : label}
    </a>
  );
}
