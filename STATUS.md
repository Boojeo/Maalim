# STATUS

Last updated: 2026-10-04 (Step 0 — read-through, no product code yet)

## (a) What I understood

1. Ma'ālim is a Next.js + TypeScript web app (ar default/RTL, en) that guides new Muslims in Saudi Arabia through Explore → Understand → Practise → Follow up, on a phone, 15 min/day.
2. Scope is 6 concepts only: shahada, tawhid, quran, five-pillars (L1), wudu, salah (L2). Prerequisites are in `content/curriculum.json`.
3. All religious content comes from `/content/*.json`, supplied and verified by people. I never write, recall or paraphrase Quran, hadith or rulings. Gaps become `[CONTENT NEEDED: …]` placeholders listed below.
4. `verified: false` passages never reach a learner. They show only with `DEV_ALLOW_UNVERIFIED=1` plus a permanent red banner, and a production build must fail if an unverified passage would be shown.
5. F3 explainer: retrieve → generate → citation guard (drop uncited sentences; if < 2 survive, show the verified source text verbatim). Provider-agnostic `lib/llm.ts` (mock/hosted/allam) and `lib/embeddings.ts`, temperature 0, versioned prompts in `/prompts`.
6. F5 router classifies the question, never the person: answer | refer | abstain + level L1–L4, default refer. Test set is `eval/router.jsonl` (30 draft cases; target 120).
7. F4 practice shows only `status = approved` items; a reviewer queue approves or rejects drafts; an offline script drafts items and checks they are answerable from their source span.
8. F6/F7: local-only mastery in localStorage, next-step from the prerequisite graph, handoff with a preview before sending, mentor dashboard with anonymised aggregates only. No user identifiers anywhere.
9. F8 eval harness: one command, router + explainer checks ×3 at temperature 0, writes `EVAL.md`. Phases 4, 5 and 8 are never cut.
10. Videos: only clips in `content/videos.json` with `permission: "granted"`, with creator credit and captions; a missing clip shows a labelled placeholder. No depiction of the Prophet ﷺ or the Companions. UI follows `UI_BRIEF.md` (calm, warm, 360px first, contrast ≥ 4.5:1).

## (b) What content is missing (Content needed)

| # | Missing | Needed by | Effect now |
|---|---|---|---|
| 1 | **Verified passages**: `passages.json` has a single placeholder (`wudu-001`, `verified: false`) and nothing for the other 5 concepts, nor any Arabic text. | F3, F4, router "answer" cases | The app runs on placeholders only; nothing verified can reach a learner, so the production learner view shows a "content pending review" state. |
| 2 | **Unit content** (hook question, check question, misconception fix per concept). No file exists. | F2 | Placeholders `[CONTENT NEEDED: hook for <concept>]`. I will define `content/units.json` as a schema with placeholder values only. |
| 3 | **Practice items** (MCQ / order / scenario) — none exist, and I may not author religious facts. | F4 | Seed items are structural placeholders with `status: draft`. The generator script works only from passages (mock LLM until verified passages exist). Nothing is `approved`. |
| 4 | **Referral text for L3/L4** (`content/referrals.json`, CONTENT_TODO #7). | F5, F7 | Placeholders. |
| 5 | **Video clips**: no source files are in the repo, all 3 videos have `permission: "pending"`, `creator_credit: "TODO"`, timestamps unverified. | F2 | Labelled placeholder with credit "TODO"; no clip is played. `make_clips.sh` will skip them. |
| 6 | **Captions (.vtt, ar + en)**: none exist. Caption text for a Quran/hadith-related video is religious content. | F2 | Player supports `<track>` for ar/en. It shows "[CAPTIONS NEEDED]" when absent. |
| 7 | **Named Sharia reviewer** (`reviewed_by` is null everywhere). | F4 queue, README | Reviewer name is a free-text field in `/admin/review`. |
| 8 | Router eval labels are a draft without a Sharia reviewer (`draft_pending_review`). 30 of the 120 target cases. | F5, F8 | I will report pass rates, labelled "draft labels". I will add cases only in categories already present (non-religious or clearly L4 phrasing), flagged `status: draft_pending_review`. |
| 9 | Wireframes (`design/`) — none. | UI | I follow `UI_BRIEF.md` tokens. |

## Credentials / environment

All of these are **missing** in this cloud environment, so the mock/local fallbacks are used: `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `ALLAM_ENDPOINT_URL`, `EMBEDDING_PROVIDER`, `EMBEDDING_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

Consequences: LLM = mock adapter, embeddings = deterministic mock (hashed bag-of-words), DB = local JSON fallback. Real-provider numbers in `EVAL.md` will not exist until keys are set; the report will state which adapter produced the numbers.

Toolchain checked: Node 22, npm works (registry reachable), Python 3.11, ffmpeg and jq installed, Chromium for Playwright pre-installed.

## (c) Phase plan (≈ 34 h of my 41 h share; 7 h reserve)

| Phase | Scope | Est. |
|---|---|---|
| 1 | Scaffold: Next.js, Tailwind, shadcn/ui, next-intl ar/en RTL, tokens, bottom nav, env handling, `/dev` content status | 3 h |
| 2 | Supabase migrations (PLAN §4) + pgvector, seed script, typed data access, JSON fallback | 3 h |
| 3 | F1 concept map + F2 unit player (placeholders for clips/captions) | 4 h |
| 4 | Embeddings, `retrieve()`, `/api/explain`, citation guard, cache, chips, `lib/llm.ts` + mock; tests for supported / unsupported / empty | 5 h |
| 5 | F5 router + `/api/route`, pass rate on `eval/router.jsonl` | 4 h |
| 6 | F4 practice (approved only), `/admin/review`, offline item generator + span check | 4 h |
| 7 | F6 mastery/next step, F7 handoff preview + mentor dashboard | 4 h |
| 8 | F8 eval harness → `EVAL.md` (3 runs, variance, latency, cost estimate) | 3 h |
| 9 | Polish: states, a11y, README, SOURCES_AND_COMPONENTS, `/demo`, static fallback | 3 h |

Each phase ends with lint + typecheck + tests, a commit, a push, and a STATUS update.

## (d) Assumptions and flagged conflicts

1. **Branch:** `START_HERE.md` / `CLAUDE.md` say `build/mvp`, but this session was provisioned to push only to `claude/cool-wright-ob23xt`. I am using **`claude/cool-wright-ob23xt`** and will not push elsewhere unless told. Phase commits are pushed there. PRs are not opened unless you ask (session rule), although START_HERE suggests one per phase.
2. The repo contained only `maalim-starter_1.zip`. I unpacked it into the repo root. The zip stays in place; delete it when convenient.
3. **Router and empty corpus:** the seed set expects `answer` for in-scope questions, which needs verified passages to exist. The router decides the *action* from the question (scope + level). The explainer then falls back to "content pending" when retrieval is empty. In-scope `answer` cases therefore pass the router even though the explainer has nothing verified to say. EVAL.md reports both numbers separately.
4. The router is a deterministic rule-based classifier by default (no LLM needed), with an optional LLM refinement behind `lib/llm.ts`. The rules are classification patterns only (e.g. "my wife", "fatwa"), not Islamic content. Risk: overfitting to 30 labelled cases; I will report a held-out split once cases are added.
5. Seed case 29 ("answer without sources") is treated as `answer`, with the guard still requiring citations. Cases 27 and 28 are adversarial; I use the labels as given.
6. Production gate: "build fails if any shown passage is unverified" is implemented as a check run in `next build` over passages that the learner views can load. With zero verified passages the learner views load none, so the build passes.
7. Demo content in the repo is synthetic; no real user data.
8. Fonts: IBM Plex Sans Arabic via `next/font/google` falls back to system fonts if Google Fonts is unreachable at build time.

## Done / Next / Blockers

- **Done:** Step 0 read-through, STATUS.md.
- **Next:** Phase 1.
- **Blockers:** **`git push` fails with HTTP 403** ("Claude doesn't have GitHub access to Boojeo/Maalim"; tried twice). The GitHub MCP tools can read the repo (only `main` exists), so the Claude GitHub App/connection lacks write access. Fix: install the app at https://github.com/apps/claude/installations/select_target or reconnect at https://claude.ai/connect-github. Until then commits are **local only** in this ephemeral container and will be lost if the session ends. I retry the push at the end of every phase. Other than that, no blockers for building. Content and credentials above limit how real the demo can be.
