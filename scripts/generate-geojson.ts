/**
 * Build public/data/systems.geojson from the water_systems table.
 *
 * Uses short property keys to keep the file small for the map page:
 *   id  pwsid
 *   n   pws_name
 *   c   city_served
 *   s   state_code
 *   g   grade
 *   p   population_served
 *   w   worst_compound
 *   r   worst_ratio
 *
 * Coordinates are written with 5-decimal precision (~1 m).
 *
 * Run: npm run data:geojson
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const OUT = path.join(
  __dirname,
  "..",
  "public",
  "data",
  "systems.geojson"
);

async function fetchAll() {
  const out: any[] = [];
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("water_systems")
      .select(
        "pwsid,pws_name,city_served,state_code,latitude,longitude,grade,worst_compound,worst_ratio,population_served"
      )
      .not("latitude", "is", null)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

async function main() {
  console.log("Fetching water systems with coordinates...");
  const rows = await fetchAll();
  console.log(`  ${rows.length.toLocaleString()} systems`);

  const features = rows.map((r) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [
        +Number(r.longitude).toFixed(5),
        +Number(r.latitude).toFixed(5),
      ],
    },
    properties: {
      id: r.pwsid,
      n: r.pws_name,
      c: r.city_served,
      s: r.state_code,
      g: r.grade,
      p: r.population_served,
      w: r.worst_compound,
      r: r.worst_ratio,
    },
  }));

  const fc = { type: "FeatureCollection", features };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(fc));

  const stat = fs.statSync(OUT);
  console.log(`Wrote ${OUT}`);
  console.log(`  features: ${features.length.toLocaleString()}`);
  console.log(`  size:     ${(stat.size / 1024).toFixed(1)} KB (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
