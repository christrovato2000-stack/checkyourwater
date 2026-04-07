/**
 * For each Wave 1 launch city, look up its zip codes in zip_to_water_system,
 * pull the resulting water systems, and print a summary table for manual
 * verification.
 *
 * Run: npx tsx scripts/verify-launch-cities.ts
 */
import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { LAUNCH_CITIES } from "../src/lib/constants";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  console.log(
    "City                 | Zip   | PWSID     | System Name                                   | Grade | Worst    | Ratio"
  );
  console.log(
    "---------------------+-------+-----------+-----------------------------------------------+-------+----------+------"
  );

  for (const city of LAUNCH_CITIES) {
    for (const zip of city.zips) {
      const { data: maps, error: mErr } = await sb
        .from("zip_to_water_system")
        .select("pwsid")
        .eq("zip_code", zip);
      if (mErr) {
        console.log(`${city.city.padEnd(20)} | ${zip} | ERROR: ${mErr.message}`);
        continue;
      }
      if (!maps?.length) {
        console.log(
          `${city.city.padEnd(20)} | ${zip} | (no PWSIDs found)`
        );
        continue;
      }
      for (const m of maps) {
        const { data: sys } = await sb
          .from("water_systems")
          .select("pwsid,pws_name,grade,worst_compound,worst_ratio")
          .eq("pwsid", m.pwsid)
          .single();
        if (!sys) continue;
        console.log(
          `${city.city.padEnd(20)} | ${zip} | ${sys.pwsid} | ${(sys.pws_name ?? "").slice(0, 45).padEnd(45)} | ${(sys.grade ?? "?").padEnd(5)} | ${(sys.worst_compound ?? "-").padEnd(8)} | ${sys.worst_ratio ?? "-"}`
        );
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
