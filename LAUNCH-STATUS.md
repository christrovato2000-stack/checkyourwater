# CheckYourWater.org — Launch Status

Last updated: 2026-04-06 (end of Mission 10 — final build mission)

## Core Features
- [x] Zip code search (31,055 zip mappings, 10,297 water systems)
- [x] National coverage verified via `scripts/test-national-search.ts` (17/20 spot checks hit — gaps are commercial/PO-box zips)
- [x] Helpful empty state for unmapped zips (suggests nearby zip + links to /cities)
- [x] Letter grades A–F based on EPA MCLs
- [x] 20 city pages with AI-generated summaries
- [x] 29 chemical explainer pages
- [x] Interactive national map (10,071 systems with coordinates)
- [x] Dynamic `/system/[pwsid]` pages — ISR-generated on first visit for ANY system in the database, not just launch cities
- [x] Action guide with filter recommendations
- [x] About and methodology pages (GitHub links point to christrovato2000-stack/checkyourwater)

## Infrastructure
- [x] Live at checkyourwater.org
- [x] HTTPS with valid certificate
- [x] ISR caching (24-hour revalidation)
- [x] On-demand revalidation endpoint — `POST /api/revalidate?secret=...&path=...&tag=...`
- [x] GitHub repo (public): https://github.com/christrovato2000-stack/checkyourwater
- [x] Supabase keep-alive cron (`.github/workflows/keep-alive.yml`)
- [x] Weekly pg_dump backup (`.github/workflows/backup.yml`)
- [x] Manual data-refresh workflow (`.github/workflows/data-refresh.yml`) ready for UCMR 5 final release in fall 2026
- [x] Security headers

## Quality
- [x] WCAG 2.1 AA accessibility compliance
- [x] Custom 404 and error pages
- [x] Dynamic OG images for social sharing
- [x] Sitemap and robots.txt
- [x] Mobile-responsive on all pages
- [x] Zero TypeScript errors (`npx tsc --noEmit` clean)

## Pre-Outreach (Chris to complete)
- [ ] Set up Umami analytics (add `NEXT_PUBLIC_UMAMI_WEBSITE_ID` to Vercel)
- [ ] Set up Cloudflare Email Routing for hello@/press@/data@checkyourwater.org
- [ ] Add `REVALIDATION_SECRET` to Vercel env vars (any random string — must match `.env.local`)
- [ ] Add `DATABASE_URL` to GitHub Actions secrets (already needed by backup.yml)
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to GitHub Actions secrets (needed by data-refresh.yml — same values as Vercel)
- [ ] Run Lighthouse on homepage and one city page (target 90+)
- [ ] Test social sharing: paste a city URL into Twitter, verify OG card shows
- [ ] Review `~/research/mission-4/synthesis/ALL-EMAILS-READY-TO-SEND.md`
- [ ] Upgrade Supabase to Pro ($25/mo) before sending first journalist email

## Outreach Sequence (from research Mission 4 playbook)
- [ ] Phase 0: Twitter pre-warming (like/reply to journalist tweets)
- [ ] Phase 1: Community org emails (Kim Chapman first)
- [ ] Phase 2: Local journalist emails (Mara Hoplamazian, Dylan Jackson)
- [ ] Phase 3: State capitol reporters
- [ ] Phase 4: Officials (after coverage exists)
- [ ] Phase 5: National journalists (Sharon Lerner, Jason Dearen)

## Reference
- Outreach playbook: `~/research/mission-4/synthesis/OUTREACH-PLAYBOOK.md`
- Ready-to-send emails: `~/research/mission-4/synthesis/ALL-EMAILS-READY-TO-SEND.md`

The build is done. The research is done. The emails are written. The tool is live. 176 million Americans need this.
