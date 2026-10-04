# Sources and components registry (required by the challenge terms, §9)

| Component | Type | Source / owner | Purpose | Date added | Licence / permission |
|---|---|---|---|---|---|
| Next.js, Tailwind, shadcn/ui, next-intl | Library | npm | App framework and UI | 2026-10-04 | MIT / open source (verify on install) |
| Supabase (Postgres + pgvector) | Service | Supabase | Database and vector search | | Free tier |
| QuranEnc | Content source | quranenc.com | Verified Quran translations | | TO CONFIRM |
| HadeethEnc | Content source | hadeethenc.com | Verified hadith translations and explanations | | TO CONFIRM |
| IslamHouse API v3 | Content source | islamhouse.com | Articles and translated material | | TO CONFIRM |
| LLM (provider TBD) | Model/API | | Explanations, practice items, router | | TO CONFIRM |
| Embedding model (e.g. bge-m3) | Model | | Passage retrieval | | TO CONFIRM |
| Wudu video: "تعلم الوضوء في 120 ثانية" (6iSdWuL4zlQ) | Video | creator permission | Main lesson clip | | Permission: PENDING |
| Wudu video: "تعلم الوضوء الصحيح" (qH_JEpge3Gc) | Video | creator permission | Scenario clip | | Permission: PENDING |
| Wudu video: "السنن النبوية – صفة الوضوء" (fnQR3In8HTQ) | Video | creator permission | Reference only | | Permission: PENDING |
| Next.js 16, React 19, Tailwind 4, TypeScript | Library | npm | App framework | 2026-10-04 | MIT |
| next-intl | Library | npm | ar/en i18n, RTL | 2026-10-04 | MIT |
| @fontsource/ibm-plex-sans-arabic | Font | npm (IBM Plex) | UI font (Arabic + Latin) | 2026-10-04 | SIL OFL 1.1 |
| lucide-react, class-variance-authority, clsx, tailwind-merge, @radix-ui/react-slot | Library | npm | shadcn-style UI primitives, icons | 2026-10-04 | ISC / Apache-2.0 / MIT |
| zod, @supabase/supabase-js | Library | npm | Validation; Supabase client | 2026-10-04 | MIT |
| vitest, tsx, @playwright/test | Dev tool | npm | Tests, scripts, screenshots | 2026-10-04 | MIT / Apache-2.0 |
| Mock LLM adapter (`lib/llm.ts`) | Code (ours) | this repo | Deterministic extractive stand-in used when no LLM key is set: it only selects existing sentences from the passages | 2026-10-04 | Project licence |
| Mock embedder (`lib/embeddings.ts`) | Code (ours) | this repo | Hashed bag-of-words + trigram vectors for retrieval when no embedding API key is set | 2026-10-04 | Project licence |
| Synthetic test fixtures (`tests/fixtures/content`) | Test data (ours) | this repo | Obviously fake text and generated colour-bar clips for tests; never religious content, never shipped to learners | 2026-10-04 | Project licence |

