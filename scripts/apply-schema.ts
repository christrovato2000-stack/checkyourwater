/**
 * Apply scripts/schema.sql to the Supabase project.
 *
 * Supabase's PostgREST does not expose a generic SQL endpoint, but the
 * management "SQL Runner" endpoint is not publicly documented for service-role
 * keys. The most reliable path is to ship the schema via a direct Postgres
 * connection string (DATABASE_URL) OR to paste the file into the SQL editor.
 *
 * This script tries the `pg-meta` style /pg/query endpoint first, and if that
 * fails, prints instructions and exits non-zero so the user can run it
 * manually in the Supabase SQL editor.
 */
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Supabase credentials missing from .env.local");
  }
  const sql = fs.readFileSync(SCHEMA_PATH, "utf-8");

  // Try Supabase's undocumented pg-meta query endpoint first (works for
  // many self-managed Supabase projects using the service role key).
  const endpoint = `${SUPABASE_URL}/pg/query`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      console.log("Schema applied successfully via /pg/query");
      return;
    }
    console.error(
      `  /pg/query returned ${res.status}: ${await res.text()}`
    );
  } catch (e) {
    console.error("  /pg/query failed:", (e as Error).message);
  }

  console.error(
    "\nCould not apply schema programmatically. Please run the SQL in\n" +
      SCHEMA_PATH +
      "\nmanually via the Supabase dashboard SQL editor:\n" +
      "  https://supabase.com/dashboard/project/_/sql\n"
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
