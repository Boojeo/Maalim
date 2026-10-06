# Ma'ālim — project rules

Project: a web app that guides new Muslims through a 4-stage learning journey
(Explore → Understand → Practise → Follow up) using short real videos, grounded
explanations with citations, practice scenarios and a human-handoff mentor dashboard.
Hackathon build window: 4–6 Oct 2026. Read PLAN.md before any task.

## Stack
Next.js (App Router) + TypeScript + Tailwind + shadcn/ui, next-intl (ar/en),
Supabase (Postgres + pgvector) with a local JSON fallback, Vercel. One repo, one deploy.
All LLM calls go through lib/llm.ts so the provider is swappable (adapters: hosted API,
ALLaM endpoint, mock). Embeddings through lib/embeddings.ts (multilingual model, e.g. bge-m3).

## Content-safety rules (never break these)
1. Never write, invent, recall or paraphrase Islamic rulings, Quran, hadith or explanations
   yourself. All religious content comes from /content/*.json (verified, reviewed by a person).
   If content is missing: use a clearly marked placeholder ("[CONTENT NEEDED: ...]"), list it
   in STATUS.md, and continue with other work.
   **Owner decision (2026-10-06):** Claude may DRAFT neutral learner-facing wording that makes no religious claim
   (unit hook questions, hand-off and crisis wording) so the Sharia reviewer can edit and approve it. Drafts are stored
   with `verified: false` and never reach learners until a named reviewer verifies them. Quotations (Quran, hadith),
   rulings, "misconception and fix" text, source selection and anything that states what Islam says remain human-supplied;
   passages may be fetched verbatim from the official source APIs by code, as unverified, never written by the model.
2. Passages with "verified": false must never reach a learner. They are visible only when
   DEV_ALLOW_UNVERIFIED=1, with a permanent red "UNVERIFIED CONTENT" banner. A production
   build must fail if any shown passage is unverified.
3. Every generated explanation sentence must cite a retrieved passage. Implement a citation
   guard that drops unsupported sentences. If fewer than 2 sentences survive, show the
   verified source text verbatim.
4. The router classifies the QUESTION, never the person. Levels L1–L4 are a data field:
   L1 core beliefs, L2 settled practical rulings, L3 differing scholarly views → neutral note
   + refer, L4 personal/sensitive/fatwa/out of scope → abstain + human handoff. Default = refer.
5. Never issue a fatwa or a personal ruling. Never present the model's own opinion as Islamic
   guidance.
6. Anonymous by default. Progress in localStorage. No tracking of personal data. Synthetic
   data only in the repo and demo.
7. Only items with status = 'approved' are shown to learners.
8. Do not depict or dramatise the Prophet ﷺ or the Companions anywhere (text, image, video).
9. Videos: only clips listed in content/videos.json. Show the creator credit. Do not use a clip
   whose "permission" is not "granted".

## Engineering rules
- RTL-first: logical Tailwind classes (ms-, me-, ps-, pe-, text-start). Test at 360px.
- Mobile-first, accessible: labels, focus states, contrast >= 4.5:1, captions on all video.
- temperature 0 for generation; prompts live in /prompts as versioned files (e.g. explain.v1.md).
- Work in small vertical slices (UI + API + DB + test). Run lint, typecheck and tests before
  saying a task is done. Do not start features that were not asked for.
- Keep SOURCES_AND_COMPONENTS.md updated when adding a dependency, model, source or video.
- Never commit secrets. Use .env.local. Provide .env.example.
- Update STATUS.md after every phase: done / next / blockers / content needed.

## Definition of done for a feature
Works on mobile width in Arabic (RTL) and English, has a test or eval case, has no console
errors, and is listed as done in STATUS.md.

## Cloud-environment rules
- You run in a cloud sandbox. The user cannot open localhost: verify with tests and Playwright
  screenshots (save to /design/screens) and rely on Vercel preview deployments from the branch.
- Work on branch build/mvp, commit and push after every phase.
- Secrets come from environment variables, not .env.local. If missing, use the mock adapters.
- The network is allow-listed: never download model weights at runtime (huggingface.co may be
  blocked). Use hosted APIs behind lib/llm.ts and lib/embeddings.ts, with mock fallbacks.
- Never commit source videos (public/videos/src is gitignored) or files over 10 MB.
