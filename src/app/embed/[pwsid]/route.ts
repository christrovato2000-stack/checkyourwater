/**
 * Route: GET /embed/[pwsid]
 *
 * Returns a self-contained HTML widget designed to be loaded inside
 * an iframe on any external website. No site nav, no footer, no
 * cookie banners, no React framework bundle. Inline CSS only.
 *
 * Implemented as a Route Handler so it bypasses the root layout
 * (which would otherwise wrap every page in Nav/Footer chrome).
 */
import type { NextRequest } from "next/server";
import { loadSystem } from "@/lib/cityData";
import type { SystemWithCompounds } from "@/lib/cityData";
import type { Grade } from "@/types/database";

export const runtime = "nodejs";

const GRADE_COLORS: Record<Grade, string> = {
  A: "#16a34a",
  B: "#65a30d",
  C: "#ca8a04",
  D: "#dc2626",
  F: "#991b1b",
};

const GRADE_COLORS_DARK: Record<Grade, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#ef4444",
  F: "#dc2626",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function summaryLine(system: SystemWithCompounds): string {
  const wc = system.worst_compound;
  const wr = system.worst_ratio;
  switch (system.grade) {
    case "A":
      return "No PFAS detected";
    case "B":
      return wc
        ? `${wc} detected below federal limit`
        : "PFAS detected below federal limit";
    case "C":
      return wc && wr
        ? `${wc} at ${Math.round(wr * 100)}% of the federal limit`
        : "PFAS approaching the federal limit";
    case "D":
      return wc && wr
        ? `${wc} at ${wr.toFixed(2)}x the federal limit`
        : "PFAS exceeds the federal limit";
    case "F":
      return wc && wr
        ? `${wc} at ${wr.toFixed(2)}x the federal limit`
        : "PFAS far above the federal limit";
    default:
      return "Grade not yet assigned";
  }
}

function fmtPop(n: number | null): string {
  if (!n) return "Population not reported";
  return `Serving ${n.toLocaleString("en-US")} residents`;
}

function buildBar(system: SystemWithCompounds): string {
  // Find the worst detected compound with a federal limit.
  const worst = system.compounds
    .filter((c) => c.detected && c.mcl != null && c.avg_concentration != null)
    .sort((a, b) => (b.mcl_ratio ?? 0) - (a.mcl_ratio ?? 0))[0];
  if (!worst) return "";
  const ratio = worst.mcl_ratio ?? 0;
  // Cap visual width at 100% but show overflow indicator if exceeding.
  const fillPct = Math.min(100, ratio * 100);
  const limitPct = ratio >= 1 ? 100 / ratio : 100;
  return `
    <div class="bar-row">
      <div class="bar-track">
        <div class="bar-fill" style="width:${fillPct.toFixed(1)}%"></div>
        <div class="bar-limit" style="left:${limitPct.toFixed(1)}%"></div>
      </div>
      <div class="bar-meta">
        <span>${escapeHtml(worst.abbrev)}: ${(worst.avg_concentration ?? 0).toFixed(1)} ppt</span>
        <span>EPA limit: ${(worst.mcl ?? 0).toFixed(1)} ppt</span>
      </div>
    </div>`;
}

function renderHtml(system: SystemWithCompounds): string {
  const grade = system.grade;
  const gradeBg = grade ? GRADE_COLORS[grade] : "#475569";
  const gradeBgDark = grade ? GRADE_COLORS_DARK[grade] : "#94a3b8";
  const letter = grade ?? "-";
  const summary = summaryLine(system);
  const popLine = fmtPop(system.population_served);
  const bar = buildBar(system);
  const fullUrl = `https://checkyourwater.org/system/${system.pwsid}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(system.pws_name)} - PFAS water quality</title>
<base target="_parent" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    line-height: 1.4;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }
  .row1 {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .system-name {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }
  .state {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .row2 {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
    flex-wrap: wrap;
  }
  .badge {
    width: 64px;
    height: 64px;
    border-radius: 8px;
    background: ${gradeBg};
    color: #ffffff;
    font-weight: 800;
    font-size: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 1;
  }
  .badge-text {
    flex: 1;
    min-width: 180px;
  }
  .summary {
    font-size: 13px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }
  .pop {
    font-size: 12px;
    color: #475569;
    margin: 4px 0 0;
  }
  .bar-row { margin-top: 14px; }
  .bar-track {
    position: relative;
    height: 10px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: #dc2626;
    border-radius: 4px;
  }
  .bar-limit {
    position: absolute;
    top: -2px;
    bottom: -2px;
    width: 2px;
    background: #0f172a;
  }
  .bar-meta {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    font-size: 11px;
    color: #475569;
  }
  .full-link {
    display: inline-block;
    margin-top: 16px;
    font-size: 12px;
    color: #1d4ed8;
    text-decoration: none;
    font-weight: 600;
  }
  .full-link:hover { text-decoration: underline; }
  .branding {
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;
    font-size: 10px;
    color: #94a3b8;
  }
  .branding a { color: inherit; text-decoration: none; }
  .branding a:hover { text-decoration: underline; }

  @media (max-width: 360px) {
    .row2 { flex-direction: column; align-items: flex-start; }
    .badge-text { min-width: 0; }
  }

  @media (prefers-color-scheme: dark) {
    .container { background: #1a1a1a; border-color: #27272a; }
    .system-name { color: #f1f5f9; }
    .state { color: #94a3b8; }
    .summary { color: #f1f5f9; }
    .pop { color: #cbd5e1; }
    .badge { background: ${gradeBgDark}; color: #0a0a0a; }
    .bar-track { background: #27272a; }
    .bar-fill { background: #ef4444; }
    .bar-limit { background: #f1f5f9; }
    .bar-meta { color: #cbd5e1; }
    .full-link { color: #60a5fa; }
    .branding { color: #71717a; border-top-color: #27272a; }
  }
</style>
</head>
<body>
  <div class="container" role="region" aria-label="PFAS water quality summary for ${escapeHtml(system.pws_name)}">
    <div class="row1">
      <div class="system-name" title="${escapeHtml(system.pws_name)}">${escapeHtml(system.pws_name)}</div>
      <div class="state">${escapeHtml(system.state_code)}</div>
    </div>
    <div class="row2">
      <div class="badge" aria-label="Grade ${letter}">${letter}</div>
      <div class="badge-text">
        <p class="summary">${escapeHtml(summary)}</p>
        <p class="pop">${escapeHtml(popLine)}</p>
      </div>
    </div>
    ${bar}
    <a class="full-link" href="${fullUrl}" target="_blank" rel="noopener">See full results at CheckYourWater.org &rarr;</a>
    <div class="branding">
      Data from EPA UCMR 5 via <a href="https://checkyourwater.org" target="_blank" rel="noopener">CheckYourWater.org</a>
    </div>
  </div>
</body>
</html>`;
}

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/embed/[pwsid]">
) {
  const { pwsid } = await ctx.params;
  const payload = await loadSystem(pwsid);
  if (!payload) {
    return new Response("Not found", { status: 404 });
  }

  // TODO: increment an embed view counter in Supabase. Skipped for now
  // to keep this route fast and side-effect free.

  const html = renderHtml(payload.system);
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Security-Policy": "frame-ancestors *",
      "X-Frame-Options": "ALLOWALL",
    },
  });
}
