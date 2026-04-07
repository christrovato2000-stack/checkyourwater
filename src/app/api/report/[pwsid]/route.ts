/**
 * Route: GET /api/report/[pwsid]
 *
 * Generates a one-page PDF water quality report card for a single
 * public water system. Pure pdf-lib, no browser dependencies.
 */
import type { NextRequest } from "next/server";
import { loadSystem } from "@/lib/cityData";
import { generateSystemPdf } from "@/lib/pdfReport";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/report/[pwsid]">
) {
  const { pwsid } = await ctx.params;
  const payload = await loadSystem(pwsid);
  if (!payload) {
    return new Response("Water system not found", { status: 404 });
  }

  const bytes = await generateSystemPdf(payload);

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="water-quality-report-${pwsid}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
