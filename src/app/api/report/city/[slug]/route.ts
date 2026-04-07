/**
 * Route: GET /api/report/city/[slug]
 *
 * Generates a multi-page city PDF report: an overview page followed
 * by one report card per system serving that city.
 */
import type { NextRequest } from "next/server";
import { loadCity } from "@/lib/cityData";
import { generateCityPdf } from "@/lib/pdfReport";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/report/city/[slug]">
) {
  const { slug } = await ctx.params;
  const payload = await loadCity(slug);
  if (!payload) {
    return new Response("City not found", { status: 404 });
  }

  const bytes = await generateCityPdf(payload);

  return new Response(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="water-quality-report-${slug}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
