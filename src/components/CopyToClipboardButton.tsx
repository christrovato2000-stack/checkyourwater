"use client";

import { useState } from "react";

export default function CopyToClipboardButton({
  text,
  label = "Copy to clipboard",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 font-sans text-sm font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
