# CheckYourWater.org

Free, open-source tool showing PFAS contamination levels in American drinking water.

**Live at [checkyourwater.org](https://checkyourwater.org)**

## What it does

Enter your zip code and see your water system's PFAS contamination grade (A through F), based on EPA testing data. Get plain-language explanations of each chemical detected, and specific action steps based on your results.

## Data

- **Source:** EPA Unregulated Contaminant Monitoring Rule, 5th Cycle (UCMR 5)
- **Coverage:** 10,297 water systems, ~97% of US population served by large/medium systems
- **Zip mappings:** 31,055 zip-to-system rows — national coverage, not just the launch cities
- **Compounds:** 29 PFAS "forever chemicals"
- **Grading:** Based on EPA Maximum Contaminant Levels (MCLs) finalized April 2024

## Tech stack

- Next.js 16 (App Router, ISR)
- Supabase (PostgreSQL + PostGIS)
- MapLibre GL JS
- Claude Sonnet 4.6 (AI-generated explainers)
- Vercel (hosting)

## Run locally

```bash
git clone https://github.com/christrovato2000-stack/checkyourwater.git
cd checkyourwater
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic + revalidation secret
npm run dev
```

Open http://localhost:3000.

### Environment variables

See `.env.example`. You'll need:

- A Supabase project (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- An Anthropic API key (`ANTHROPIC_API_KEY`) for the content-generation scripts
- A random string for `REVALIDATION_SECRET` (any value — must match the one set in Vercel)

## Methodology

Grades are assigned based on the highest MCL ratio across all regulated PFAS compounds in a system. See [checkyourwater.org/methodology](https://checkyourwater.org/methodology) for full details.

| Grade | Criteria |
| ----- | -------- |
| A | No PFAS detected above the Minimum Reporting Level |
| B | PFAS detected, all below 50% of the EPA MCL |
| C | Worst compound between 50% and 100% of EPA MCL |
| D | At least one compound exceeds the EPA MCL (up to 5×) |
| F | At least one compound exceeds 5× the EPA MCL |

## Refreshing the data

The UCMR 5 testing cycle runs 2023–2026. When EPA publishes a new release:

1. **Trigger the refresh workflow.** GitHub → Actions → "Data Refresh" → Run workflow → type `refresh` → Run workflow. This downloads the latest UCMR 5 zip, re-parses, re-grades, re-seeds the database, regenerates `public/data/systems.geojson`, runs validation, and commits the new GeoJSON to `main`.
2. **Flush the Vercel cache.** Call the revalidation endpoint to expire ISR pages without waiting for the 24-hour timer:
   ```bash
   curl -X POST "https://checkyourwater.org/api/revalidate?secret=$REVALIDATION_SECRET&path=/"
   curl -X POST "https://checkyourwater.org/api/revalidate?secret=$REVALIDATION_SECRET&path=/cities"
   curl -X POST "https://checkyourwater.org/api/revalidate?secret=$REVALIDATION_SECRET&path=/city/[slug]&type=page"
   curl -X POST "https://checkyourwater.org/api/revalidate?secret=$REVALIDATION_SECRET&path=/system/[pwsid]&type=page"
   ```

## Testing national coverage

```bash
npx tsx scripts/test-national-search.ts
```

Spot-checks 20 zip codes from across the country (not just the launch cities) against `zip_to_water_system` and reports hit/miss coverage. Expected: ~85% — the gaps are commercial/PO-box zips that don't map to residential service areas, which hit the improved "no data" empty state with a link to `/cities`.

## Backups

`.github/workflows/backup.yml` runs `pg_dump` against the production Supabase database every Monday at 06:00 UTC and stores the dump as a 30-day workflow artifact. Requires the `DATABASE_URL` GitHub Actions secret.

## License

MIT

## Contact

- Press: press@checkyourwater.org
- General: hello@checkyourwater.org
- Data corrections: data@checkyourwater.org

Built by [Chris Trovato](https://github.com/christrovato2000-stack).
