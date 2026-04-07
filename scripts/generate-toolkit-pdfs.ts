/**
 * Pre-generates static PDF versions of the toolkit templates.
 *
 * Outputs:
 *   public/toolkit/pdfs/council-letter.pdf
 *   public/toolkit/pdfs/records-request.pdf
 *
 * Run with:
 *   npx tsx scripts/generate-toolkit-pdfs.ts
 *
 * The text comes from src/lib/toolkitTemplates.ts so the PDFs and the
 * on-page rendering can never drift apart.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  COUNCIL_LETTER_TEMPLATE,
  RECORDS_REQUEST_TEMPLATE,
} from "../src/lib/toolkitTemplates";

// US Letter, 0.75" margins
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;

function wrap(text: string, font: import("pdf-lib").PDFFont, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split("\n")) {
    if (rawLine === "") {
      out.push("");
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, FONT_SIZE);
      if (width > maxWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

async function buildPdf(title: string, body: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setProducer("CheckYourWater Toolkit");
  doc.setCreator("CheckYourWater Toolkit");

  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const lines = wrap(body, font, CONTENT_WIDTH);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  // Title
  page.drawText(title, {
    x: MARGIN,
    y,
    size: 14,
    font: bold,
    color: rgb(0, 0, 0),
  });
  y -= 24;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= LINE_HEIGHT;

  for (const line of lines) {
    if (y < MARGIN + LINE_HEIGHT) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    if (line) {
      page.drawText(line, {
        x: MARGIN,
        y,
        size: FONT_SIZE,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    y -= LINE_HEIGHT;
  }

  // Footer on every page
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(
      `CheckYourWater.org community toolkit  |  page ${i + 1} of ${pages.length}`,
      {
        x: MARGIN,
        y: MARGIN / 2,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5),
      }
    );
  }

  return doc.save();
}

async function main(): Promise<void> {
  const outDir = join(process.cwd(), "public", "toolkit", "pdfs");
  mkdirSync(outDir, { recursive: true });

  const targets: { file: string; title: string; body: string }[] = [
    {
      file: "council-letter.pdf",
      title: "Letter Template: PFAS in Your Drinking Water",
      body: COUNCIL_LETTER_TEMPLATE,
    },
    {
      file: "records-request.pdf",
      title: "Public Records Request Template: PFAS Testing Data",
      body: RECORDS_REQUEST_TEMPLATE,
    },
  ];

  for (const t of targets) {
    const bytes = await buildPdf(t.title, t.body);
    const out = join(outDir, t.file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, bytes);
    console.log(`wrote ${out} (${bytes.byteLength} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
