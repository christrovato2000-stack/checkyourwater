# CheckYourWater.org

A free, plain-English report card for U.S. drinking water systems based on EPA UCMR 5 PFAS testing.

Built with Next.js, Supabase, and EPA UCMR 5 data.

Live site: https://checkyourwater.org

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:3000.

## Environment variables

See `.env.example`. You'll need a Supabase project (URL, anon key, service role
key) and an Anthropic API key for content generation scripts.

## Data sources

- [EPA UCMR 5](https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule) — PFAS occurrence data, 2023–2026
- [SDWIS](https://www.epa.gov/ground-water-and-drinking-water/safe-drinking-water-information-system-sdwis-federal-reporting) — public water system inventory
- [PubChem](https://pubchem.ncbi.nlm.nih.gov/) — chemical metadata for explainer pages

## License

MIT
