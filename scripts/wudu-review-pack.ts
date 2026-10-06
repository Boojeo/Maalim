// Builds review/WUDU_REVIEW.pdf: everything a Sharia reviewer needs to check for the wudu landmark, in one file.
// Nothing here is written by the model as religious content: passages are verbatim from the source site,
// step order/timestamps come from content/videos.json, questions are built mechanically from the step order,
// captions are the machine drafts exactly as they are in public/videos/captions.
import fs from "node:fs";
import path from "node:path";
import { buildDemoItems, stepLabel, usedSteps } from "../lib/demo";
import { cell, esc, table, writePack } from "../lib/review-html";
import type { Candidate } from "../lib/sources";
import type { VideoEntry } from "../lib/types";
import { parseVtt, formatTime } from "../lib/vtt";

const root = process.cwd();
const video = (JSON.parse(fs.readFileSync(path.join(root, "content/videos.json"), "utf8")) as { videos: VideoEntry[] }).videos.find((v) => v.id === "wudu-main")!;
const cands = JSON.parse(fs.readFileSync(path.join(root, "content/intake/candidates/wudu.json"), "utf8")) as Candidate[];
const steps = usedSteps(video);
const parts: string[] = [];

parts.push(`<h1>Ma'ālim — Wudu landmark: review sheet</h1>
<p class="meta">Reviewer: ______________________ &nbsp; Date: ____________ &nbsp; Video: ${esc(video.id)} (${esc(video.creator_credit)})</p>
<div class="box"><p><strong>Five decisions, about 30 minutes.</strong></p>
<ol><li><strong>A. Sources:</strong> tick the hadith the app may quote for wudu (2 to 4). Nothing is edited.</li>
<li><strong>B. Clip steps:</strong> confirm the order and the number of washes shown in the clip, and the time stamps.</li>
<li><strong>C. Questions:</strong> the check questions only ask which step the clip shows next. Approve, edit or reject each.</li>
<li><strong>D. Captions:</strong> machine drafts. Write the corrected text for each line (Arabic and English) or mark the line OK.</li>
<li><strong>E. Permission:</strong> confirm the creator's permission to use the clip (written, from the channel owner).</li></ol>
<p>The assistant did not choose, rank or write any religious text on this sheet. Passages are copied byte-for-byte from the source. Step labels are neutral action names; the Arabic ones are drafts for you to confirm.</p></div>`);

parts.push(`<h2>A. Source passages (HadeethEnc, verbatim)</h2>
<p class="note">${cands.length} candidates, in the order the source site lists them. Tick the ones to use; if none fits, write another ID.</p>
<table><thead><tr><th style="width:62px">Use?</th><th>Arabic</th><th>English</th><th style="width:110px">Source</th></tr></thead><tbody>${cands
  .map(
    (x) => `<tr><td>☐ <strong>${esc(x.source_id)}</strong></td><td dir="rtl" lang="ar"><strong>${esc(x.title_ar)}</strong><br>${esc(x.text_ar).replace(/\n/g, "<br>")}</td><td><strong>${esc(x.title_en)}</strong><br>${esc(x.text_en).replace(/\r?\n/g, "<br>")}</td><td>${esc(x.attribution_en)}<br>Grade: ${esc(x.grade_en)} / ${esc(x.grade_ar)}<br><a href="${esc(x.url_en)}">${esc(x.url_en.replace("https://", ""))}</a></td></tr>`,
  )
  .join("")}</tbody></table>`);

parts.push(`<h2>B. Steps shown in the clip</h2>
<p class="note">Order and times were read from the video by the team (±1 s). Please confirm the order, the number of washes per step, and that nothing important is cut. Arabic labels are drafts.</p>` +
  table(
    ["#", "English label", "Arabic label (draft)", "Clip time", "Notes"],
    steps.map((s) => [String(s.n), stepLabel(s, "en"), stepLabel(s, "ar"), `${s.start} – ${s.end}`, s.note ?? ""]),
    true,
  ));

const demo = (lang: "en" | "ar") => buildDemoItems(video, lang);
parts.push(`<h2>C. Check questions (built only from the clip's step order)</h2>
<p class="note">Each question asks which step the clip shows next, so it is only as correct as table B. If you approve B, these follow.</p>` +
  table(
    ["Question (EN)", "Question (AR)", "Right answer (EN / AR)"],
    demo("en").map((e, i) => {
      const ar = demo("ar")[i].item;
      const answerIds = Array.isArray(e.item.answer) ? e.item.answer : [e.item.answer];
      const txt = (it: typeof e.item) => answerIds.map((id) => it.options.find((o) => o.id === id)?.text).join(" → ");
      return [e.item.prompt, ar.prompt, `${txt(e.item)}\n${txt(ar)}`];
    }),
    true,
  ));

parts.push(`<h2>D. Captions (machine drafts, must be corrected)</h2>
<p class="note">Arabic is a speech-to-text of dialect speech; English is a machine translation of it. Known problems: misheard words and wrong English lines. Write the corrected line, or tick OK. The corrected text goes into public/videos/captions/*.vtt and the NOTE DRAFT line is removed.</p>`);
for (const s of steps) {
  const base = `wudu-main_${s.n}_${s.key}`;
  for (const lang of ["ar", "en"] as const) {
    const f = path.join(root, "public/videos/captions", `${base}.${lang}.vtt`);
    if (!fs.existsSync(f)) continue;
    const cues = parseVtt(fs.readFileSync(f, "utf8"));
    parts.push(`<h3>Clip ${s.n} · ${esc(stepLabel(s, "en"))} · ${lang === "ar" ? "Arabic" : "English"} <span class="meta">(${esc(base)}.${lang}.vtt)</span></h3>
<table><thead><tr><th style="width:90px">Time</th><th>Draft line</th><th>Corrected line</th><th style="width:40px">OK</th></tr></thead><tbody>${cues
      .map((c) => `<tr><td>${formatTime(c.start).slice(0, 8)}</td>${cell(c.text)}<td>&nbsp;</td><td>☐</td></tr>`)
      .join("")}</tbody></table>`);
  }
}

parts.push(`<h2>E. Permission and sign-off</h2>
<p>☐ The channel owner (${esc(video.creator_credit)}) gave written permission to use this clip in the app, with credit. Evidence (link / message date): ______________________</p>
<p>☐ Steps and order (B) confirmed &nbsp; ☐ Questions (C) approved &nbsp; ☐ Captions (D) corrected &nbsp; ☐ Sources (A) chosen</p>
<p>Reviewer name: ______________________ &nbsp; Signature: ______________ &nbsp; Date: ____________</p>
<p class="note">After sign-off the team runs: <code>npm run import:source -- --concept wudu --level L2 --hadeethenc &lt;ticked ids&gt;</code>, then you check each imported passage against its link and the team runs <code>npm run verify:passages -- --by "Name" --ids …</code>.</p>`);

writePack("WUDU_REVIEW", "Ma'ālim wudu review sheet", parts.join("\n")).catch((e) => {
  console.error(e);
  process.exit(1);
});
