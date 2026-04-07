"use client";

/**
 * Collapsible "Embed this data" panel for system pages.
 * Shows the iframe snippet, a copy-to-clipboard button, and a live
 * preview of the embed.
 */
import { useState } from "react";

interface Props {
  pwsid: string;
  systemName: string;
  origin?: string;
}

export default function EmbedCodeGenerator({
  pwsid,
  systemName,
  origin = "https://checkyourwater.org",
}: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const src = `${origin}/embed/${pwsid}`;
  const code = `<iframe src="${src}" width="100%" height="300" frameborder="0" style="border: 1px solid #e5e7eb; border-radius: 8px;" title="PFAS water quality data for ${systemName}"></iframe>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers: fall back to selecting the textarea
      const ta = document.getElementById(
        `embed-code-${pwsid}`
      ) as HTMLTextAreaElement | null;
      if (ta) {
        ta.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-sans text-sm font-semibold text-slate-700 transition-colors hover:border-blue-400 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M7.78 4.22a.75.75 0 0 1 0 1.06L3.06 10l4.72 4.72a.75.75 0 1 1-1.06 1.06l-5.25-5.25a.75.75 0 0 1 0-1.06l5.25-5.25a.75.75 0 0 1 1.06 0Zm4.44 0a.75.75 0 0 1 1.06 0l5.25 5.25a.75.75 0 0 1 0 1.06l-5.25 5.25a.75.75 0 1 1-1.06-1.06L16.94 10l-4.72-4.72a.75.75 0 0 1 0-1.06Z" />
        </svg>
        {open ? "Hide embed code" : "Embed this data"}
      </button>

      {open && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="font-sans text-sm text-slate-700">
            Paste this snippet into any web page. The embed updates
            automatically when new data is published.
          </p>

          <div className="relative mt-4">
            <textarea
              id={`embed-code-${pwsid}`}
              readOnly
              value={code}
              rows={4}
              className="w-full resize-none rounded-md border border-slate-300 bg-white p-3 pr-24 font-mono text-xs text-slate-800"
            />
            <button
              type="button"
              onClick={copy}
              className="absolute right-2 top-2 rounded-md bg-blue-600 px-3 py-1.5 font-sans text-xs font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="mt-5 font-sans text-xs font-semibold uppercase tracking-widest text-slate-500">
            Live preview
          </p>
          <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-white">
            <iframe
              src={`/embed/${pwsid}`}
              width="100%"
              height={300}
              title={`PFAS water quality data for ${systemName}`}
              style={{ border: "none", display: "block" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
