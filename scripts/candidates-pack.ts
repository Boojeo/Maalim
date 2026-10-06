// Builds review/CANDIDATE_PASSAGES.pdf: the candidate hadith fetched by scripts/fetch-candidates.ts, for the Sharia
// reviewer to TICK the ones to use per concept. Text is exactly as published; nothing is ranked or filtered by us.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { esc, writePack } from "../lib/review-html";
import type { Candidate } from "../lib/sources";
import type { Curriculum } from "../lib/types";

const root = process.cwd();
const dir = path.join(root, "content", "intake", "candidates");
const cur = JSON.parse(fs.readFileSync(path.join(root, "content", "curriculum.json"), "utf8")) as Curriculum;
let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  /* not a git checkout */
}

const parts: string[] = [];
parts.push(`<h1>Ma'ālim — Candidate passages for selection</h1>
<p class="meta">Source: hadeethenc.com (its own API), fetched ${esc(new Date().toISOString().slice(0, 10))}, commit ${esc(commit)}. Reviewer: ______________________ &nbsp; Date: ____________</p>
<div class="box">
<p><strong>What to do.</strong> For each topic below, tick the hadith you approve as <em>sources the app may quote and cite</em> for that topic (a few per topic is enough: 2 to 4). Edit nothing in the text. If none fits, write "none" and name another hadith ID or a Quran reference (e.g. 112:1-4).</p>
<p><strong>What these are.</strong> Candidates in the order the source site lists them within the folders named under each heading. The assistant did not choose, rank or filter them by meaning. Arabic and English are copied exactly as published, with the source's own attribution and grading.</p>
<p><strong>Please also decide.</strong> Several narrations mention the Prophet ﷺ and the Companions by name. Quoting them verbatim is not dramatisation, but tell us if any should not be shown to new learners.</p>
<p><strong>Then.</strong> Send the ticked IDs back. The team imports exactly those (as unverified), you check each one against its link, and only then are they verified.</p></div>`);

for (const c of [...cur.concepts].sort((a, b) => a.order - b.order)) {
  const file = path.join(dir, `${c.id}.json`);
  if (!fs.existsSync(file)) continue;
  const cands = JSON.parse(fs.readFileSync(file, "utf8")) as Candidate[];
  parts.push(`<h2>${esc(c.title_en)} · ${esc(c.title_ar)} <span class="meta">(${esc(c.id)}, ${esc(c.level)})</span></h2>
<p class="note">${cands.length} candidates, listed from the source-site folders in content/intake/source-categories.json, in the site's own order.</p>
<table><thead><tr><th style="width:62px">Use?</th><th>Hadith (Arabic)</th><th>Hadith (English)</th><th style="width:110px">Source</th></tr></thead><tbody>${cands
    .map(
      (x) => `<tr><td>☐ <strong>${esc(x.source_id)}</strong></td>
<td dir="rtl" lang="ar"><strong>${esc(x.title_ar)}</strong><br>${esc(x.text_ar).replace(/\n/g, "<br>")}</td>
<td><strong>${esc(x.title_en)}</strong><br>${esc(x.text_en).replace(/\r?\n/g, "<br>")}</td>
<td>${esc(x.attribution_en)}<br>${esc(x.attribution_ar)}<br>Grade: ${esc(x.grade_en)} / ${esc(x.grade_ar)}<br><a href="${esc(x.url_en)}">${esc(x.url_en.replace("https://", ""))}</a></td></tr>`,
    )
    .join("")}</tbody></table>`);
}

writePack("CANDIDATE_PASSAGES", "Ma'ālim candidate passages", parts.join("\n")).catch((e) => {
  console.error(e);
  process.exit(1);
});
