/**
 * Server-side PDF report card generation using pdf-lib.
 *
 * Pure JS, no native deps, works in Vercel serverless. Uses Helvetica
 * (a standard PDF font) so no font files need to be embedded.
 *
 * Layout target: US Letter (8.5" x 11"), 0.75" margins, designed for
 * black-and-white printing with color accents on the grade badge.
 */
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
} from "pdf-lib";
import type { SystemPagePayload, CityPagePayload, SystemWithCompounds } from "@/lib/cityData";
import type { Grade } from "@/types/database";

// Page dimensions (US Letter, 72 dpi)
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54; // 0.75 inch
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Grade colors as RGB 0..1 tuples
type RGB = [number, number, number];
const GRADE_RGB: Record<Grade, RGB> = {
  A: hex("#16a34a"),
  B: hex("#65a30d"),
  C: hex("#ca8a04"),
  D: hex("#dc2626"),
  F: hex("#991b1b"),
};
const NEUTRAL: RGB = hex("#4a5568");
const BLACK: RGB = [0, 0, 0];
const GRAY_LIGHT: RGB = hex("#f5f5f5");
const GRAY_BORDER: RGB = hex("#cbd5e1");
const GRAY_TEXT: RGB = hex("#475569");

function hex(h: string): RGB {
  const n = h.replace("#", "");
  return [
    parseInt(n.slice(0, 2), 16) / 255,
    parseInt(n.slice(2, 4), 16) / 255,
    parseInt(n.slice(4, 6), 16) / 255,
  ];
}

function gradeColor(g: Grade | null): RGB {
  return g ? GRADE_RGB[g] : NEUTRAL;
}

function gradeLine(system: SystemWithCompounds): string {
  const wc = system.worst_compound;
  const wr = system.worst_ratio;
  switch (system.grade) {
    case "A":
      return "No PFAS compounds detected above reporting limits";
    case "B":
      return "PFAS detected below federal limits";
    case "C":
      return wc && wr
        ? `${wc} detected at ${Math.round(wr * 100)}% of the federal limit, approaching the threshold`
        : "PFAS approaching the federal limit";
    case "D":
      return wc && wr
        ? `${wc} exceeds the federal limit at ${wr.toFixed(2)}x the EPA maximum`
        : "PFAS exceeds the federal limit";
    case "F":
      return wc && wr
        ? `${wc} severely exceeds the federal limit at ${wr.toFixed(2)}x the EPA maximum`
        : "PFAS severely exceeds the federal limit";
    default:
      return "Grade not yet assigned";
  }
}

function fmtPop(n: number | null): string {
  if (!n) return "Not reported";
  return n.toLocaleString("en-US");
}

function fmtDate(d = new Date()): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

interface DrawCtx {
  page: PDFPage;
  fonts: Fonts;
  /** Current y cursor (absolute, from bottom of page). */
  y: number;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawText(
  ctx: DrawCtx,
  text: string,
  opts: {
    x?: number;
    size?: number;
    bold?: boolean;
    color?: RGB;
    align?: "left" | "right" | "center";
    maxWidth?: number;
  } = {}
) {
  const size = opts.size ?? 10;
  const font = opts.bold ? ctx.fonts.bold : ctx.fonts.regular;
  const color = opts.color ?? BLACK;
  let x = opts.x ?? MARGIN;
  const w = font.widthOfTextAtSize(text, size);
  if (opts.align === "right") {
    x = MARGIN + CONTENT_WIDTH - w;
  } else if (opts.align === "center") {
    x = MARGIN + (CONTENT_WIDTH - w) / 2;
  }
  ctx.page.drawText(text, {
    x,
    y: ctx.y,
    size,
    font,
    color: rgb(color[0], color[1], color[2]),
    maxWidth: opts.maxWidth,
  });
}

function hr(ctx: DrawCtx, color: RGB = BLACK, thickness = 1) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_WIDTH, y: ctx.y },
    thickness,
    color: rgb(color[0], color[1], color[2]),
  });
}

function drawGradeBadge(
  page: PDFPage,
  fonts: Fonts,
  grade: Grade | null,
  centerX: number,
  centerY: number,
  size: number
) {
  const color = gradeColor(grade);
  page.drawRectangle({
    x: centerX - size / 2,
    y: centerY - size / 2,
    width: size,
    height: size,
    color: rgb(color[0], color[1], color[2]),
  });
  const letter = grade ?? "-";
  const fontSize = size * 0.65;
  const w = fonts.bold.widthOfTextAtSize(letter, fontSize);
  page.drawText(letter, {
    x: centerX - w / 2,
    y: centerY - fontSize * 0.36,
    size: fontSize,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
}

function drawHeader(ctx: DrawCtx, system: SystemWithCompounds) {
  // Top title row
  ctx.y = PAGE_HEIGHT - MARGIN - 16;
  drawText(ctx, "Water Quality Report Card", { size: 18, bold: true });
  drawText(ctx, "CheckYourWater.org", {
    size: 12,
    align: "right",
  });
  ctx.y -= 12;
  hr(ctx);

  // System name + location line
  ctx.y -= 22;
  const nameLines = wrapText(system.pws_name, ctx.fonts.bold, 16, CONTENT_WIDTH);
  for (const line of nameLines) {
    drawText(ctx, line, { size: 16, bold: true });
    ctx.y -= 18;
  }
  ctx.y -= 2;
  const loc = [
    system.city_served
      ? `${system.city_served}, ${system.state_code}`
      : system.state_code,
    `PWSID: ${system.pwsid}`,
    `Population served: ${fmtPop(system.population_served)}`,
  ].join("  |  ");
  drawText(ctx, loc, { size: 10, color: GRAY_TEXT });
  ctx.y -= 14;
  drawText(
    ctx,
    `Based on EPA UCMR 5 testing data (2023-2025)  |  Report generated ${fmtDate()}`,
    { size: 9, color: GRAY_TEXT }
  );
}

function drawGradeSection(ctx: DrawCtx, system: SystemWithCompounds) {
  ctx.y -= 28;
  const badgeTopY = ctx.y;
  const badgeSize = 84;
  const badgeCenterX = MARGIN + badgeSize / 2;
  const badgeCenterY = badgeTopY - badgeSize / 2;
  drawGradeBadge(
    ctx.page,
    ctx.fonts,
    system.grade,
    badgeCenterX,
    badgeCenterY,
    badgeSize
  );

  // Right of badge: short summary
  const textX = MARGIN + badgeSize + 18;
  const textWidth = CONTENT_WIDTH - badgeSize - 18;
  const lineText = gradeLine(system);
  const lines = wrapText(lineText, ctx.fonts.bold, 13, textWidth);
  let lineY = badgeTopY - 20;
  for (const line of lines) {
    ctx.page.drawText(line, {
      x: textX,
      y: lineY,
      size: 13,
      font: ctx.fonts.bold,
      color: rgb(0, 0, 0),
    });
    lineY -= 16;
  }
  // Methodology note below the line text
  lineY -= 6;
  const methWrap = wrapText(
    "The EPA set enforceable limits for six PFAS compounds in April 2024. Grade reflects the worst single compound result.",
    ctx.fonts.regular,
    9,
    textWidth
  );
  for (const line of methWrap) {
    ctx.page.drawText(line, {
      x: textX,
      y: lineY,
      size: 9,
      font: ctx.fonts.regular,
      color: rgb(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]),
    });
    lineY -= 12;
  }

  ctx.y = badgeCenterY - badgeSize / 2 - 12;
}

function drawFindingsTable(ctx: DrawCtx, system: SystemWithCompounds) {
  ctx.y -= 18;
  drawText(ctx, "Findings", { size: 13, bold: true });
  ctx.y -= 12;

  const detected = system.compounds
    .filter((c) => c.detected && (c.avg_concentration ?? 0) > 0)
    .sort((a, b) => (b.mcl_ratio ?? -1) - (a.mcl_ratio ?? -1));

  // Column layout: Compound (35%), Detected (15%), EPA Limit (15%), Ratio (15%), Status (20%)
  const cols = [
    { x: MARGIN + 6, w: CONTENT_WIDTH * 0.32, label: "Compound" },
    { x: MARGIN + CONTENT_WIDTH * 0.32 + 6, w: CONTENT_WIDTH * 0.18, label: "Detected (ppt)" },
    { x: MARGIN + CONTENT_WIDTH * 0.5 + 6, w: CONTENT_WIDTH * 0.16, label: "EPA Limit (ppt)" },
    { x: MARGIN + CONTENT_WIDTH * 0.66 + 6, w: CONTENT_WIDTH * 0.14, label: "Ratio" },
    { x: MARGIN + CONTENT_WIDTH * 0.8 + 6, w: CONTENT_WIDTH * 0.2, label: "Status" },
  ];

  const rowHeight = 16;
  const headerHeight = 18;

  // Header row
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - headerHeight + 4,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: rgb(0.9, 0.9, 0.9),
  });
  for (const c of cols) {
    ctx.page.drawText(c.label, {
      x: c.x,
      y: ctx.y - 8,
      size: 9,
      font: ctx.fonts.bold,
      color: rgb(0, 0, 0),
    });
  }
  ctx.y -= headerHeight;

  if (detected.length === 0) {
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - rowHeight + 4,
      width: CONTENT_WIDTH,
      height: rowHeight,
      borderColor: rgb(GRAY_BORDER[0], GRAY_BORDER[1], GRAY_BORDER[2]),
      borderWidth: 0.5,
    });
    ctx.page.drawText(
      "No PFAS compounds were detected in EPA testing of this water system.",
      {
        x: MARGIN + 6,
        y: ctx.y - 8,
        size: 10,
        font: ctx.fonts.regular,
        color: rgb(0, 0, 0),
      }
    );
    ctx.y -= rowHeight;
    return;
  }

  let zebra = false;
  for (const c of detected) {
    if (zebra) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y - rowHeight + 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]),
      });
    }
    zebra = !zebra;

    const conc = c.avg_concentration ?? 0;
    const concStr = conc.toFixed(1);
    const mclStr = c.mcl != null ? c.mcl.toFixed(1) : "-";
    const ratioStr = c.mcl_ratio != null ? c.mcl_ratio.toFixed(2) : "-";
    let status = "No federal limit";
    let statusBold = false;
    if (c.mcl_ratio != null) {
      if (c.mcl_ratio > 1) {
        status = "EXCEEDS";
        statusBold = true;
      } else {
        status = "Below limit";
      }
    }

    const cells = [
      { text: c.abbrev, font: ctx.fonts.regular },
      { text: concStr, font: ctx.fonts.regular },
      { text: mclStr, font: ctx.fonts.regular },
      { text: ratioStr, font: ctx.fonts.regular },
      { text: status, font: statusBold ? ctx.fonts.bold : ctx.fonts.regular },
    ];
    cells.forEach((cell, i) => {
      ctx.page.drawText(cell.text, {
        x: cols[i].x,
        y: ctx.y - 8,
        size: 10,
        font: cell.font,
        color: rgb(0, 0, 0),
      });
    });
    ctx.y -= rowHeight;
  }
}

function drawContextSection(
  ctx: DrawCtx,
  system: SystemWithCompounds,
  contextBody: string | null
) {
  ctx.y -= 16;
  drawText(ctx, "What This Means", { size: 13, bold: true });
  ctx.y -= 14;

  const detectedCount = system.compounds.filter((c) => c.detected).length;
  const exceedanceCount = system.compounds.filter(
    (c) => (c.mcl_ratio ?? 0) > 1
  ).length;

  let body: string;
  if (system.grade === "A") {
    body =
      "No PFAS compounds were detected in this system's testing. This does not guarantee the absence of PFAS, as testing covers specific compounds at specific detection limits.";
  } else if (contextBody) {
    body = firstSentences(contextBody, 3);
  } else {
    body = `This water system serves ${fmtPop(
      system.population_served
    )} residents in ${
      system.city_served ?? system.state_code
    }. EPA testing detected ${detectedCount} PFAS compound${
      detectedCount === 1 ? "" : "s"
    }, ${exceedanceCount} of which exceed federal drinking water limits. Residents served by this system should consider installing an NSF 53 or NSF 58 certified water filter.`;
  }

  for (const line of wrapText(body, ctx.fonts.regular, 10, CONTENT_WIDTH)) {
    drawText(ctx, line, { size: 10 });
    ctx.y -= 13;
  }
}

function drawActionSection(ctx: DrawCtx) {
  ctx.y -= 14;
  drawText(ctx, "What You Can Do", { size: 13, bold: true });
  ctx.y -= 14;

  const bullets = [
    "Request your utility's full Consumer Confidence Report (CCR) for additional water quality data",
    "Consider an NSF 53 (pitcher) or NSF 58 (reverse osmosis) certified filter if PFAS were detected",
    "Attend your local water board or city council meeting to ask about treatment plans",
  ];
  for (const b of bullets) {
    const lines = wrapText("• " + b, ctx.fonts.regular, 10, CONTENT_WIDTH - 8);
    for (let i = 0; i < lines.length; i++) {
      drawText(ctx, lines[i], { size: 10, x: MARGIN + (i === 0 ? 0 : 10) });
      ctx.y -= 13;
    }
  }
}

function drawFooter(ctx: DrawCtx, system: SystemWithCompounds) {
  const footerY = MARGIN + 32;
  ctx.page.drawLine({
    start: { x: MARGIN, y: footerY + 28 },
    end: { x: MARGIN + CONTENT_WIDTH, y: footerY + 28 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  // Three columns
  ctx.page.drawText(
    "Data source: EPA Unregulated Contaminant Monitoring Rule 5 (UCMR 5)",
    {
      x: MARGIN,
      y: footerY + 18,
      size: 8,
      font: ctx.fonts.regular,
      color: rgb(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]),
    }
  );
  const mid = `checkyourwater.org/system/${system.pwsid}`;
  const midW = ctx.fonts.bold.widthOfTextAtSize(mid, 8);
  ctx.page.drawText(mid, {
    x: MARGIN + (CONTENT_WIDTH - midW) / 2,
    y: footerY + 6,
    size: 8,
    font: ctx.fonts.bold,
    color: rgb(0, 0, 0),
  });
  const right = "Free public service tool. Not affiliated with EPA.";
  const rW = ctx.fonts.regular.widthOfTextAtSize(right, 8);
  ctx.page.drawText(right, {
    x: MARGIN + CONTENT_WIDTH - rW,
    y: footerY + 18,
    size: 8,
    font: ctx.fonts.regular,
    color: rgb(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]),
  });
  const note =
    "This report is provided for informational purposes. It is not a substitute for professional water quality analysis.";
  const noteLines = wrapText(note, ctx.fonts.regular, 7, CONTENT_WIDTH);
  let ny = footerY - 6;
  for (const l of noteLines) {
    const w = ctx.fonts.regular.widthOfTextAtSize(l, 7);
    ctx.page.drawText(l, {
      x: MARGIN + (CONTENT_WIDTH - w) / 2,
      y: ny,
      size: 7,
      font: ctx.fonts.regular,
      color: rgb(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]),
    });
    ny -= 9;
  }
}

function firstSentences(text: string, n: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const matches = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned];
  return matches.slice(0, n).join(" ").trim();
}

/**
 * Generate a one-page system PDF report card.
 */
export async function generateSystemPdf(
  payload: SystemPagePayload
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Water Quality Report Card: ${payload.system.pws_name}`);
  doc.setAuthor("CheckYourWater.org");
  doc.setSubject("PFAS drinking water quality report");
  doc.setProducer("CheckYourWater.org");
  doc.setCreator("CheckYourWater.org");

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const ctx: DrawCtx = { page, fonts, y: PAGE_HEIGHT - MARGIN };

  drawHeader(ctx, payload.system);
  drawGradeSection(ctx, payload.system);
  drawFindingsTable(ctx, payload.system);
  drawContextSection(ctx, payload.system, payload.summary?.body ?? null);
  drawActionSection(ctx);
  drawFooter(ctx, payload.system);

  return await doc.save();
}

/**
 * City PDF: an overview page followed by one section per system.
 */
export async function generateCityPdf(
  payload: CityPagePayload
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(
    `Water Quality Report Card: ${payload.city.city_name}, ${payload.city.state_code}`
  );
  doc.setAuthor("CheckYourWater.org");
  doc.setProducer("CheckYourWater.org");
  doc.setCreator("CheckYourWater.org");

  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  // Special case: a single-system city renders identically to the system PDF.
  if (payload.systems.length === 1) {
    const sys = payload.systems[0];
    const synthetic: SystemPagePayload = {
      system: sys,
      fullCompoundTable: sys.compounds,
      citySlug: payload.city.slug,
      summary: payload.summary,
    };
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const ctx: DrawCtx = { page, fonts, y: PAGE_HEIGHT - MARGIN };
    drawHeader(ctx, sys);
    drawGradeSection(ctx, sys);
    drawFindingsTable(ctx, sys);
    drawContextSection(ctx, sys, synthetic.summary?.body ?? null);
    drawActionSection(ctx);
    drawFooter(ctx, sys);
    return await doc.save();
  }

  // Overview page
  const overview = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const octx: DrawCtx = { page: overview, fonts, y: PAGE_HEIGHT - MARGIN };
  drawCityOverview(octx, payload);

  // One page per system
  for (const sys of payload.systems) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const ctx: DrawCtx = { page, fonts, y: PAGE_HEIGHT - MARGIN };
    drawHeader(ctx, sys);
    drawGradeSection(ctx, sys);
    drawFindingsTable(ctx, sys);
    drawContextSection(ctx, sys, null);
    drawActionSection(ctx);
    drawFooter(ctx, sys);
  }

  return await doc.save();
}

function drawCityOverview(ctx: DrawCtx, payload: CityPagePayload) {
  const { city, systems, totalPopulation } = payload;

  ctx.y = PAGE_HEIGHT - MARGIN - 16;
  drawText(ctx, "Water Quality Report Card", { size: 18, bold: true });
  drawText(ctx, "CheckYourWater.org", { size: 12, align: "right" });
  ctx.y -= 12;
  hr(ctx);

  ctx.y -= 26;
  drawText(ctx, `${city.city_name}, ${city.state_name}`, {
    size: 22,
    bold: true,
  });
  ctx.y -= 18;
  drawText(
    ctx,
    `Report generated ${fmtDate()}  |  EPA UCMR 5 testing data (2023-2025)`,
    { size: 10, color: GRAY_TEXT }
  );

  // Grade badge
  ctx.y -= 30;
  const badgeSize = 96;
  const badgeCenterX = MARGIN + badgeSize / 2;
  const badgeCenterY = ctx.y - badgeSize / 2;
  drawGradeBadge(
    ctx.page,
    ctx.fonts,
    city.grade,
    badgeCenterX,
    badgeCenterY,
    badgeSize
  );

  const textX = MARGIN + badgeSize + 24;
  const textWidth = CONTENT_WIDTH - badgeSize - 24;
  const stats: Array<[string, string]> = [
    ["Population served", fmtPop(totalPopulation || city.population)],
    ["Water systems tested", String(systems.length)],
    [
      "Compounds detected",
      String(payload.totalDetected),
    ],
    [
      "Above federal limits",
      String(payload.totalExceedances),
    ],
  ];
  let sy = ctx.y - 14;
  for (const [label, value] of stats) {
    ctx.page.drawText(label, {
      x: textX,
      y: sy,
      size: 9,
      font: ctx.fonts.regular,
      color: rgb(GRAY_TEXT[0], GRAY_TEXT[1], GRAY_TEXT[2]),
    });
    ctx.page.drawText(value, {
      x: textX + 130,
      y: sy,
      size: 11,
      font: ctx.fonts.bold,
      color: rgb(0, 0, 0),
    });
    sy -= 18;
  }

  ctx.y = badgeCenterY - badgeSize / 2 - 24;

  // Summary blurb
  drawText(ctx, "Summary", { size: 13, bold: true });
  ctx.y -= 14;

  const blurb = payload.summary?.body
    ? firstSentences(payload.summary.body, 3)
    : `${city.city_name}, ${city.state_name} has ${systems.length} public water system${
        systems.length === 1 ? "" : "s"
      } in EPA testing. ${payload.totalDetected} PFAS compound${
        payload.totalDetected === 1 ? " was" : "s were"
      } detected, and ${payload.totalExceedances} exceed${
        payload.totalExceedances === 1 ? "s" : ""
      } federal drinking water limits.`;
  for (const line of wrapText(blurb, ctx.fonts.regular, 11, CONTENT_WIDTH)) {
    drawText(ctx, line, { size: 11 });
    ctx.y -= 14;
  }

  // Systems list
  ctx.y -= 12;
  drawText(ctx, "Systems Included in This Report", { size: 13, bold: true });
  ctx.y -= 14;

  for (const s of systems) {
    const line = `${s.grade ?? "-"}  |  ${s.pws_name}  (${fmtPop(
      s.population_served
    )} served)`;
    const lines = wrapText(line, ctx.fonts.regular, 10, CONTENT_WIDTH);
    for (const l of lines) {
      drawText(ctx, l, { size: 10 });
      ctx.y -= 13;
    }
    ctx.y -= 2;
    if (ctx.y < MARGIN + 80) break;
  }

  // Mini footer pointer
  const footerY = MARGIN + 18;
  ctx.page.drawLine({
    start: { x: MARGIN, y: footerY + 14 },
    end: { x: MARGIN + CONTENT_WIDTH, y: footerY + 14 },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  });
  const url = `checkyourwater.org/city/${city.slug}`;
  const urlW = ctx.fonts.bold.widthOfTextAtSize(url, 9);
  ctx.page.drawText(url, {
    x: MARGIN + (CONTENT_WIDTH - urlW) / 2,
    y: footerY + 2,
    size: 9,
    font: ctx.fonts.bold,
    color: rgb(0, 0, 0),
  });
}
