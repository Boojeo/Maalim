# START HERE — the one prompt

Open this folder in Claude Code, then paste **everything inside the box below** as your first message.

```
You are building the MVP of "Ma'ālim" (معالم) for a hackathon (4–6 Oct 2026). Work autonomously, but follow the rules.

ENVIRONMENT (you run in a cloud sandbox, not on my laptop)
- I cannot open localhost. Verify with tests, Playwright screenshots saved to /design/screens, and by deploying a Vercel preview from the branch when I connect it.
- Work on a branch named build/mvp and push after every phase so nothing is lost if the session ends. Open one PR per phase if a GitHub remote exists.
- Secrets come from the environment variables configured for this cloud environment, not from .env.local. Read them with process.env. If one is missing, use the mock adapter and list it in STATUS.md.
- Outbound network is allow-listed. huggingface.co and other model hosts may be blocked, so do NOT download embedding or LLM weights at runtime. Use a hosted embedding API behind lib/embeddings.ts, with a mock fallback. Check that npm and pip installs work before relying on them.
- FFmpeg may or may not be installed. Check with `which ffmpeg`; install it if you can. Never commit source videos (public/videos/src is gitignored), only the encoded clips in public/videos.

STEP 0 — READ FIRST (do not write code yet)
Read, in this order: CLAUDE.md, PLAN.md, UI_BRIEF.md, README.md, content/CONTENT_TODO.md, content/curriculum.json, content/passages.json, content/videos.json, eval/router.jsonl, scripts/make_clips.sh. Then write STATUS.md with: (a) a 10-line summary of what you understood, (b) what content is missing, (c) your phase plan with time estimates (total budget: about 41 build hours across 3 people, so keep each phase small), (d) any assumptions. Do not wait for approval unless something in the "STOP AND ASK" list applies.

STOP AND ASK (only for these)
- You need Islamic text, a ruling, an explanation or a source ID that is not in /content. Never invent or recall religious content from memory. Use a clearly marked placeholder and list it in STATUS.md under "Content needed".
- A required API key or credential is missing from .env.local. Build against a mock adapter and list it in STATUS.md.
- A decision would break a rule in CLAUDE.md.

BUILD IN THESE PHASES. After each phase: run lint, typecheck and tests, commit with a clear message, update STATUS.md (done / next / blockers), then continue.

Phase 1 — Scaffold: Next.js (App Router, TypeScript, Tailwind, shadcn/ui), next-intl (ar default RTL, en), design tokens from UI_BRIEF.md, app shell with bottom navigation (Map · Learn · Practise · Me), .env handling, Vercel-ready. Include a /dev page that lists content status.
Phase 2 — Data layer: Supabase SQL migrations for the schema in PLAN.md section 4, a seed script loading /content/*.json, typed data access, pgvector enabled. Provide a local fallback (JSON files) so the app runs without Supabase.
Phase 3 — F1 + F2: concept map (vertical path of landmarks: locked / in progress / done by prerequisites) and the unit player (hook → video with Arabic/English captions → explanation → check). Videos come from content/videos.json. If a clip file is missing, show a labelled placeholder, never fail.
Phase 4 — Retrieval and F3: embed passages, retrieve(conceptId, query, lang), /api/explain with the citation guard exactly as in CLAUDE.md, caching, citation chips in the UI. Provider-agnostic lib/llm.ts with a mock adapter. Tests for supported, unsupported and empty-retrieval cases.
Phase 5 — F5 router: /api/route returning answer | refer | abstain + level L1–L4. Use eval/router.jsonl as the test set and report the pass rate. Default to refer. Never classify the person.
Phase 6 — F4 practice: MCQ, ordering and scenario items from items with status "approved" only; reviewer queue page (/admin/review) to approve or reject draft items; offline script that generates draft items from a passage and checks each is answerable from its source span.
Phase 7 — F6 + F7: local mastery tracking and next-step logic using the prerequisite graph; the handoff flow (user previews the summary before sending) and the mentor dashboard (referrals inbox + anonymised aggregates). No user identifiers.
Phase 8 — F8 eval harness: one command runs the router set and explainer checks three times at temperature 0 and writes EVAL.md (accuracy, citation coverage, refer/abstain precision/recall, variance, mean latency, estimated cost).
Phase 9 — Polish: error and empty states, loading states, keep-alive/static fallback page, accessibility pass, README with run steps, SOURCES_AND_COMPONENTS.md up to date, a demo script page (/demo) that follows the 5-minute story in PLAN.md.

If time is short, cut in this order: Phase 9 polish, A/B tooling, mentor dashboard charts. Never cut Phases 4, 5 or 8.

QUALITY BAR
Mobile width 360px first, RTL correct, captions on all video, contrast >= 4.5:1, no console errors. Never commit secrets. Keep commits small. If a command fails twice, stop, explain the cause in STATUS.md and take the simplest fix.

Begin with STEP 0.
```

---

## Before you paste it (cloud setup, 10 minutes)

1. **Put the repo on GitHub.** Unzip this folder, then create a new private GitHub repo and push it (or upload the unzipped files through the GitHub web page). Cloud sessions work from a GitHub repo.
2. **Start the Claude Code cloud session on that repo**, on a new branch `build/mvp`.
3. **Set environment variables in the cloud environment settings** (not in a file): `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`, `EMBEDDING_PROVIDER`, `EMBEDDING_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Leave any of them empty to use the mock or local fallbacks. If the network allowlist is restricted, allow your LLM, embeddings and Supabase hosts.
4. **Videos:** encode on your own computer with the FFmpeg command from earlier (or `scripts/make_clips.sh`) and commit only the small MP4 clips into `public/videos/` (under 8 MB each). Do not commit the raw `.webm`/`.mkv` files.
5. **Content:** fill in `content/passages.json` with verified text, as in `content/CONTENT_TODO.md`, and commit it.
6. **Wireframes:** add Khalid's screenshots to `design/`.
7. **Preview:** connect the GitHub repo to Vercel (free). Every push to `build/mvp` then gets a preview URL you can open on your phone. The cloud session cannot show you localhost.
8. Paste the prompt above as the first message.
