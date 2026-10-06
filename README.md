# Ma'ālim (معالم)

A guided, video-based learning journey for new Muslims, with grounded explanations (every sentence cited), practice scenarios and a human handoff. Built for the Islamic AI Challenge 2026, Track 3 (4–6 Oct 2026).

**Current state, blockers and content still needed:** see [STATUS.md](STATUS.md). **Measured results and their caveats:** see [EVAL.md](EVAL.md). **Registry of components, models, sources and clips:** [SOURCES_AND_COMPONENTS.md](SOURCES_AND_COMPONENTS.md).

## What is built

| # | Feature | Where |
|---|---|---|
| F1 | Concept map (vertical path, locked / ready / in progress / done from prerequisites) | `/` |
| F2 | Unit player: hook → video with ar/en captions → explanation → check → wrap-up | `/learn/[concept]` |
| F3 | Grounded explainer: retrieve → generate → citation guard → cache, citation chips | `/api/explain`, `lib/explain.ts`, `lib/citation-guard.ts` |
| F4 | Practice (MCQ / ordering / scenario) from **approved** items only; reviewer queue; offline item generator with an answerable-from-source check | `/practise`, `/admin/review`, `scripts/generate-items.ts` |
| F5 | Scope router: answer / refer / abstain + level L1–L4, default refer | `/api/route`, `lib/router.ts` |
| F6 | Local mastery and next step from the prerequisite graph | `/me`, `lib/progress.ts` |
| F7 | Ask → handoff with preview before sending → mentor dashboard (anonymous) | `/ask`, `/mentor` |
| F8 | Eval harness (router + explainer ×3 at temperature 0 → `EVAL.md`) | `npm run eval` |
| – | Demo script page following the 5-minute story | `/demo` |
| – | Content status for developers | `/dev` |
| F9 | Optional anonymous A/B pre/post study (static page vs unit); results with limits in the mentor dashboard | `/study`, `/mentor` |

## Run it

```bash
npm install
cp .env.example .env.local     # optional: with no keys the mock adapters and local JSON are used
npm run dev                    # http://localhost:3000   (Arabic, RTL, is the default)
```

In a cloud session or on Vercel, set the variables from `.env.example` in the environment settings instead of a file. Anything missing falls back automatically:

| Missing | Fallback |
|---|---|
| `LLM_*` | deterministic extractive mock (it only selects existing sentences) |
| `EMBEDDING_*` | hashed bag-of-words mock embedder |
| `SUPABASE_*` | local JSON in `/content` + a runtime file in `.data/` (`/tmp` on Vercel, ephemeral) |
| `ADMIN_TOKEN` / `MENTOR_TOKEN` | open in development, **closed in production** |
| `EXPLAIN_REQUIRE_APPROVED=1` (optional) | generated explanations stay hidden (verbatim source shown) until a reviewer approves them in `/admin/review` |

### Commands

| Command | What it does |
|---|---|
| `npm run lint` · `npm run typecheck` · `npm test` | Static checks and unit tests (111 tests) |
| `npm run test:e2e` | Builds, serves with **synthetic** fixture content, runs Playwright (flows, RTL, axe accessibility, no console errors) |
| `npm run eval` | Router + explainer ×3, guard stress test → `EVAL.md` |
| `npm run eval:router` | Router pass rate with every failure listed |
| `npm run check:content` | Content integrity gate (also runs before `npm run build`) |
| `npm run generate:items` | Draft practice items from verified passages (needs verified content) |
| `npm run seed` | Load `/content/*.json` into Supabase (no-op without credentials) |
| `npm run import:passages -- <csv>` · `npm run verify:passages -- --by "Name" --ids …` | Intake of passages a person copied verbatim (stored unverified), then reviewer verification (`content/intake/README.md`) |
| `npm run split:captions -- wudu-main` | Cut a full-video caption file into per-clip captions |
| `npm run seed:demo` | Load **synthetic** referrals/counters for the mentor dashboard demo |
| `npx tsx scripts/screens.ts [routes]` | 360 px screenshots (ar + en) into `design/screens/` |

## Content rules (short version; the full list is in `CLAUDE.md`)

- All religious content comes from `/content/*.json`, written and verified by people. The code never writes or invents it; gaps are `[CONTENT NEEDED: …]` placeholders and learners see a labelled "waiting for review" box instead.
- Unverified passages never reach learners. `DEV_ALLOW_UNVERIFIED=1` shows them behind a permanent red banner and is **refused by production builds**. `npm run build` also fails if verified/approved flags are inconsistent (`lib/content-check.ts`).
- Every generated sentence must cite a retrieved passage or it is dropped; fewer than 2 survivors → the verbatim source text.
- The router classifies the question, never the person. No fatwas, no personal rulings.
- Anonymous by default: progress lives in localStorage; the optional counters are off by default and carry no identifier.
- A video plays only with `permission: "granted"`, the clip file present and captions present; otherwise a labelled placeholder.

## Deploy (Vercel + Supabase)

1. Create a Supabase project, run `supabase/migrations/0001_init.sql`, `0002_events.sql` and `0003_explanation_review_and_study.sql` (pgvector must be available), then `npm run seed` with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set.
2. Import the repo in Vercel, set the environment variables, deploy. `vercel.json` adds a daily `/api/health` keep-alive. `public/fallback.html` is a static version of the map if the app is down.
3. Encode clips locally with `scripts/make_clips.sh` (after the creator's written permission) and commit only the small MP4s in `public/videos/` plus captions in `public/videos/captions/<id>.<ar|en>.vtt`. Never commit the raw sources (`public/videos/src/` is git-ignored).

## Folder map

| Path | Purpose |
|---|---|
| `app/` | Next.js App Router pages and API routes |
| `components/`, `lib/` | UI and logic (`lib/data` = data layer, local JSON or Supabase) |
| `content/` | Curriculum, passages, units, items, videos, router rules, referral texts (**religious content lives only here**) |
| `prompts/` | Versioned prompts (`explain.v1.md`, `items.v1.md`) |
| `eval/` | Router and explainer test sets and results |
| `supabase/migrations/` | Schema |
| `tests/`, `e2e/` | Unit tests, synthetic fixtures, Playwright |
| `design/screens/` | Screenshots from the last run |
| `CLAUDE.md`, `PLAN.md`, `UI_BRIEF.md` | Rules, plan, design brief |

## Provenance
Baseline (before 4 Oct 09:00): the starter pack (plan, rules, curriculum map, source list, seed router cases). All product code was written from 4 Oct 2026. Named Sharia reviewer for the approval queue: **TODO (team)**.
