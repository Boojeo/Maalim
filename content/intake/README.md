# Content intake (for the Sharia reviewer and the team)

Claude Code does not write Islamic text. A person copies it, exactly as published, from the source site.

## Passages (the explanations and sources the app cites)
1. Open `passages.template.csv` in Excel or Google Sheets (save as CSV UTF-8). One row per passage.
2. Columns: `id` (e.g. `wudu-001`), `concept_id` (`shahada`, `tawhid`, `quran`, `five-pillars`, `wudu`, `salah`), `lang` (`ar` or `en`), `source` (`quranenc`, `hadeethenc`, `islamhouse`), `source_id` (the exact ID on the site), `source_url` (link to that exact item), `text` (verbatim, never edited), `level` (L1 or L2 from `curriculum.json`).
3. Import (stores everything as **unverified**): `npx tsx scripts/import-passages.ts content/intake/passages.csv`
4. The reviewer compares every row with the source site. Then: `npx tsx scripts/verify-passages.ts --by "Reviewer Name" --ids wudu-001,wudu-002` (or `--all`).
5. `npm run check:content` must pass. Only verified passages ever reach a learner.

## Other files a person must write or approve
- `content/units.json`: hook question, common misunderstanding and its fix (Arabic and English) per concept; set `verified` and `reviewed_by` after review.
- `content/referrals.json`: the hand-off wording for L3, L4, out-of-scope.
- Practice items: generated from verified passages (`npm run generate:items`) and approved in `/admin/review`.
- Video captions: see `public/videos/captions/README.md`.
