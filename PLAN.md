# Ma'ālim (معالم) — Build Plan for LLM-Assisted Development

**Purpose:** the single source of truth to hand to Claude Code. Put it in the repo root as `PLAN.md`, and put section 2 plus section 3 in `CLAUDE.md`.
**Event:** Islamic AI Challenge 2026, Track 3 (interactive experiences). Build window: **4–6 Oct 2026, 09:00–23:59 Riyadh**.
**Team:** Abdallah (AI + apps), Khalid (UI + data), Mohammed (Sharia content).

> ⚠️ Provenance rule: no product code before **4 Oct 09:00**. Today (3 Oct) is for the baseline only: this plan, wireframes, curriculum map, source list, empty repo with README and licence.

---

## 1. What we are building

A web app: **a 4-stage learning journey for new Muslims in Saudi Arabia** (non-Arabic speakers, phone, 15 min/day), using **real video clips** instead of illustrations.

| Stage | Name | What the learner does |
|---|---|---|
| 0 | استكشاف Explore | Opens an interactive **concept map**; taps a landmark to get a short video + a grounded explanation |
| 1 | فهم Understand | Short unit: hook question → video → explanation → "check yourself" → misconception fix |
| 2 | ممارسة Practise | **Scenario practice**: a real video of a situation (e.g. Dhuhr at work), then order/choose steps, with feedback citing the source |
| 3 | متابعة Follow up | Spaced review of weak concepts, "what's next", and **"talk to a person"** handoff |

Plus a **mentor dashboard** (referral inbox with consented summary, anonymised aggregate progress).

**Demo story (5 min):** Maria, caregiver in Riyadh → map → wudu video + cited explanation → "Dhuhr at work" scenario, a wrong answer, the fix with the source → personal marriage question → **refer** → mentor dashboard receives it → results slide.

## 2. Non-negotiables (put in `CLAUDE.md`)

1. **Every generated sentence must cite a retrieved source passage.** A citation guard drops unsupported sentences. If fewer than 2 survive, show the verified source text verbatim.
2. **The router classifies the question, never the person.** No inference of religiosity, gender, nationality. Stage and language are user-chosen.
3. **Content levels L1–L4** are a field in the data model (L1 core beliefs, L2 settled practical rulings, L3 differing scholarly views → neutral note + refer, L4 personal/sensitive/fatwa → abstain + human handoff). Default is refer.
4. **Anonymous by default.** Progress in local storage. No real user data; **synthetic data only** in repo and demo.
5. **Only Sharia-approved items reach the live bank.** Generated explanations and items are cached once approved.
6. **No fatwas, ever.** The model never issues a ruling on a personal case.
7. **Everything reproducible:** temperature 0, fixed prompts in `/prompts`, the eval harness runs the full set 3×.
8. Maintain `SOURCES_AND_COMPONENTS.md` (component · type · source · purpose · date · licence). It is required by the terms.
9. RTL-first, Arabic + English, mobile-first.

## 3. Recommended stack (free, fast, one language)

Principle: **one TypeScript codebase, one deploy, one database.** No separate backend to wire up.

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** | Claude Code knows it best; API routes replace a backend |
| i18n / RTL | `next-intl`, Tailwind logical properties (`ms-`, `me-`) | RTL from day 1 |
| DB + vectors | **Supabase free tier** (Postgres + pgvector) | One service for content, embeddings, referrals |
| Video | **Short MP4s in Supabase Storage** (or Cloudflare R2), played with a plain `<video>` + custom overlay for decision points | No player lock-in; works offline-ish |
| LLM | One `lib/llm.ts` adapter (provider swappable). Primary: whichever API credit you have. Fallback: **ALLaM-7B** (HF endpoint) for Arabic | Sponsor alignment and no single point of failure |
| Embeddings | Multilingual API embedding (or bge-m3) | Arabic + English retrieval |
| Hosting | **Vercel** (free) | Zero-config for Next.js. Add a static fallback page. |
| Eval | Python or TS script → CSV + chart | The 25% and 15% criteria need numbers |
| Source data | QuranEnc, HadeethEnc, IslamHouse API v3, cached as JSON in repo | Offline fallback |

If the team knows another stack better, swap it. The architecture below still holds.

## 4. Architecture and data model

```
Browser (Next.js, RTL)
 ├─ Concept map ─ Unit player (video + overlays) ─ Practice engine ─ Review
 └─ calls /api/*
API routes (TypeScript)
 ├─ /api/explain     retrieve → generate → citation guard → cache
 ├─ /api/route       question → answer | refer | abstain (+ level L1–L4)
 ├─ /api/practice    approved items by concept; generation is offline/admin
 ├─ /api/next        mastery + prerequisite graph → next unit
 └─ /api/handoff     consented summary → referrals table
Supabase: concepts, prerequisites, passages(+embedding), units, videos,
          items, explanations_cache, referrals, review_queue
```

**Tables (minimum):**
- `concepts(id, slug, title_ar, title_en, level L1–L4, stage)` and `prerequisites(concept_id, requires_id)`
- `passages(id, source, source_id, lang, text, embedding, concept_id)` — verified text only
- `videos(id, concept_id, kind[lesson|scenario], url, duration, captions_ar, captions_en, license, reviewed_by)`
- `units(id, concept_id, hook, steps jsonb, order)`
- `items(id, concept_id, type[mcq|order|scenario], prompt, options, answer, source_passage_id, source_span, status[draft|approved])`
- `explanations_cache(concept_id, level, lang, text, citations jsonb, status)`
- `referrals(id, concept_id, question_hash, consented_summary, created_at, status)` — no user identifiers

## 5. Features and acceptance criteria

| # | Feature | Done when |
|---|---|---|
| F1 | **Concept map** (stage 0) | 6 landmarks render as a graph, prerequisites visible, tapping opens the unit; works at 360 px wide, RTL |
| F2 | **Unit player** with video | Video plays with captions (ar/en); pauses at decision points; hook → video → explanation → check |
| F3 | **Grounded explainer** | Every sentence carries a citation chip that opens the source passage; guard drops unsupported sentences; fallback shows verbatim source |
| F4 | **Practice scenarios** | Order/MCQ/scenario items from the approved bank; wrong answer → fix + source; each item answerable from its source span (auto-checked) |
| F5 | **Scope router** | On the 120-case set: refer recall on L3/L4 ≥ 95%, abstain on missing-reference ≥ 90% |
| F6 | **Mastery + next step** | Per-concept mastery stored locally; the next unit respects prerequisites; the user can override |
| F7 | **Handoff + mentor dashboard** | The user previews the summary before sending; the dashboard shows referrals and aggregate progress only |
| F8 | **Eval harness** | One command → `EVAL.md` with accuracy, citation coverage, refer/abstain precision, 3-run variance |
| F9 | **A/B pre/post test** | Static page vs. Ma'ālim unit on 3 concepts; reports gain, n, limits |

**Scope: 6 concepts only**: meaning of shahada, Tawhid, the Quran, the 5 pillars (overview), wudu, salah. **Cut order if time runs out:** F9 polish, F6 sophistication, Tagalog/Urdu, then dashboard charts. Never cut F3, F5, F8: they are 60% of the final score.

## 6. Video plan (real videos, the biggest risk)

- **Source options, in order of preference:** (1) filmed by the team (hands, ablution area, a phone on a tripod; nothing identifiable); (2) videos from IslamHouse/other verified sources **with a licence that permits reuse**, listed in `SOURCES_AND_COMPONENTS.md`; (3) a still-frame + audio fallback if no clip is ready.
- **Sharia review before use:** every clip is viewed by Mohammed (or a named reviewer). For wudu/salah show hands, feet and posture guidance only, with no dramatisation of the Prophet ﷺ or the Companions.
- **Format:** 10–40 s clips, 720p, H.264 MP4, < 8 MB each, captions as VTT in Arabic and English.
- **Needed by Day 1 noon:** at least 2 clips (wudu, one scenario). The rest can land during Day 2. Build the player with placeholder clips first.

## 7. How to drive Claude Code (the workflow)

1. **Repo setup (3 Oct, no product code):** `README.md`, `LICENSE`, `BASELINE.md`, `PLAN.md`, `CLAUDE.md`, `SOURCES_AND_COMPONENTS.md`, wireframes folder.
2. **Work in vertical slices, not layers.** Each prompt = one feature end-to-end (UI + API + DB + test), merged and deployed before the next.
3. **Per-feature prompt template:**
   > Read `PLAN.md` and `CLAUDE.md`. Implement **F<n>: <name>**. Acceptance criteria are in section 5. First list the files you will create or change and any assumptions. Then implement, run the tests/linter, and show how to verify it locally. Do not start other features. Update `SOURCES_AND_COMPONENTS.md` if you add a dependency or source.
4. **Use plan mode first** on F3 (citation guard) and F5 (router) — the highest-risk logic. Review the plan before code.
5. **Parallelise by owner:** Abdallah → F3, F5, F6, F8. Khalid → F1, F2, F4 UI, content data. Mohammed → review queue, L1–L4 tags, referral texts. Use separate branches and small PRs to avoid merge conflicts.
6. **Commit and deploy after every feature.** A working deployed URL at each end of day is the safety net.
7. **Keep the LLM honest:** ask Claude Code to write the failing test or eval case first for the router and guard.

## 8. Timeline

| When | Goal |
|---|---|
| **Sat 3 Oct (today)** | Baseline only: finalise this plan, curriculum map for 6 concepts, source IDs per concept, L1–L4 tags, wireframes, film/collect the first clips, create the empty repo + Supabase + Vercel projects |
| **Sun 4 Oct** | Scaffold (Next.js, RTL, i18n, DB), ingest sources → embeddings, **one concept end-to-end** (F1, F2, F3) deployed by EOD |
| **Mon 5 Oct** | All 6 concepts, F4, F5, F6, F7; user test (A/B) 13:00–17:00; fix the top 3 UX issues with before/after screenshots; eval v1 |
| **Tue 6 Oct** | Freeze features at 12:00; final eval ×3 → `EVAL.md`; ≤2-min video + backup demo video; deck (built vs. proposed labelled); **submit by 22:00** |

## 9. Risks and fallbacks

| Risk | Fallback |
|---|---|
| LLM latency/cost/outage | Pre-cache every approved explanation and item; ALLaM fallback; static verified text |
| Video not ready or not licensed | Still + audio clip; placeholder labelled "to be filmed" in the demo |
| Sharia review bottleneck | Review the seed content on 3 Oct; restrict to L1/L2 with verbatim text |
| Free tier sleeps or rate-limits | Keep-alive ping; cached JSON snapshot in repo |
| Arabic RTL bugs | Logical CSS properties from the first commit; test at 360 px |
| Scope creep | 6 concepts, 1 journey. The cut order is in section 5 |

## 10. Open questions for the team

1. Who films the videos, and where are they stored? Is there a clip licence for any third-party source?
2. Which LLM API credit do we actually have for 4–6 Oct?
3. Will the organisers provide the scientific package and the 4 content levels? Re-map L1–L4 when it arrives.
4. Do we have a named Sharia reviewer beyond Mohammed?
5. Do we need students from other faculties (UX/design, media for video, Sharia)? Recommended: **1 UX/presenter** and **1 video/media** person.
