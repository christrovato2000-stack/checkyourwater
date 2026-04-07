/**
 * Inspect UCMR5_All.txt: print header, first 10 rows, distinct
 * contaminants, distinct units, and overall row count.
 *
 * Run:  npm run data:inspect
 */
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const DATA_DIR = path.join(__dirname, "..", "data");
const UCMR_PATH = path.join(DATA_DIR, "UCMR5_All.txt");

async function main() {
  if (!fs.existsSync(UCMR_PATH)) {
    throw new Error(`UCMR5_All.txt not found at ${UCMR_PATH}`);
  }

  const contaminants = new Set<string>();
  const units = new Set<string>();
  const signs = new Set<string>();
  let headerLine = "";
  const sampleRows: string[] = [];
  let rowCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(UCMR_PATH),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (rowCount === 0) {
      headerLine = line;
    } else {
      if (sampleRows.length < 10) sampleRows.push(line);
      const cols = line.split("\t");
      // Contaminant is column index 13, Units index 15, AnalyticalResultsSign index 17
      if (cols[13]) contaminants.add(cols[13]);
      if (cols[15]) units.add(cols[15]);
      if (cols[17]) signs.add(cols[17]);
    }
    rowCount++;
  }

  console.log("=== UCMR5_All.txt header ===");
  const cols = headerLine.split("\t");
  cols.forEach((c, i) => console.log(`  [${i}] ${c}`));

  console.log("\n=== First 10 data rows ===");
  sampleRows.forEach((r, i) => {
    console.log(`--- row ${i + 1} ---`);
    const parts = r.split("\t");
    parts.forEach((p, j) => console.log(`  [${j}] ${cols[j]}: ${p}`));
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total rows (incl. header): ${rowCount.toLocaleString()}`);
  console.log(`Data rows: ${(rowCount - 1).toLocaleString()}`);
  console.log(`Distinct contaminants (${contaminants.size}):`);
  [...contaminants].sort().forEach((c) => console.log(`  ${c}`));
  console.log(`Distinct units: ${[...units].join(", ")}`);
  console.log(`Distinct result signs: ${[...signs].join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
