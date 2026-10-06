// Builds review/REVIEW_PACK.html and .pdf for the Sharia reviewer: everything a person must read, edit or approve.
// Generated from the repo files (nothing typed by hand), so it is always current. Usage: npx tsx scripts/review-pack.ts
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { loadRouterCases } from "../lib/router-eval";
import { loadRules, routeQuestion } from "../lib/router";
import type { Curriculum, Passage, ReferralFile, Unit, VideoEntry } from "../lib/types";

const root = process.cwd();
const read = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(root, f), "utf8")) as T;
const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const isAr = (s: string) => /[؀-ۿ]/.test(s);
const cell = (s: unknown) => `<td${isAr(String(s)) ? ' dir="rtl" lang="ar"' : ""}>${esc(s)}</td>`;
const decision = '<td class="dec">☐ Approve &nbsp; ☐ Edit &nbsp; ☐ Reject<br><br>Note:</td>';
const table = (head: string[], rows: string[][], withDecision = false) =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}${withDecision ? "<th>Decision</th>" : ""}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map(cell).join("")}${withDecision ? decision : ""}</tr>`)
    .join("")}</tbody></table>`;

const cur = read<Curriculum>("content/curriculum.json");
const units = read<{ units: Unit[] }>("content/units.json").units;
const refs = read<ReferralFile>("content/referrals.json");
const videos = read<{ videos: VideoEntry[] }>("content/videos.json").videos;
const passages = read<{ passages: Passage[] }>("content/passages.json").passages;
const en = read<Record<string, Record<string, unknown>>>("messages/en.json");
const ar = read<Record<string, Record<string, unknown>>>("messages/ar.json");
const rules = loadRules();
const cases = loadRouterCases();
const get = (m: Record<string, Record<string, unknown>>, k: string) => k.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)?.[p], m) as string;

let commit = "unknown";
try {
  commit = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  /* not a git checkout */
}

const SENSITIVE_UI = [
  "ask.intro", "ask.noRulings", "ask.citationNote", "ask.referTitle", "ask.referDefault", "ask.urgentTitle", "ask.urgentDefault", "ask.notFound", "ask.notReady",
  "handoff.intro", "handoff.privacy", "handoff.sentBody", "me.privacy", "me.shareHint", "welcome.body", "pending.body", "video.permission",
  "me.stages.0", "me.stages.1", "me.stages.2", "me.stages.3", "unit.hook", "unit.wrapup", "item.tryAgain",
];

const sections: string[] = [];
sections.push(`<h1>Ma'ālim — Review pack for the Sharia reviewer</h1>
<p class="meta">Generated ${new Date().toISOString().slice(0, 10)} from the project files (commit ${esc(commit)}). Reviewer name: ______________________ &nbsp; Date: ____________</p>
<div class="box"><p><strong>What this is.</strong> Everything in the app that a person with Sharia knowledge must read before it can reach a learner. Nothing below is shown to learners until you approve it. For each row tick <em>Approve</em>, <em>Edit</em> (write the corrected text) or <em>Reject</em>.</p>
<p><strong>What the app never does.</strong> It does not write Quran, hadith or rulings, does not give personal rulings or fatwas, and does not answer questions it classifies as differing views (L3) or personal / sensitive (L4): it hands them to a person.</p>
<p><strong>Who wrote what.</strong> Wording marked <em>drafted by the assistant</em> was drafted on the owner's instruction from concept titles only and makes no religious claim, but you decide. Quotations and sources are never written by the assistant: they are copied verbatim from the source sites and shown for you to check.</p></div>`);

sections.push(`<h2>A. Curriculum (order, levels, prerequisites)</h2><p>Levels: L1 core beliefs · L2 settled practical rulings · L3 differing scholarly views (the app refers) · L4 personal / sensitive / fatwa / out of scope (the app abstains).</p>` +
  table(["#", "Concept", "Title (ar)", "Title (en)", "Level", "Requires first", "Objectives (en, from the starter pack)"],
    [...cur.concepts].sort((a, b) => a.order - b.order).map((c) => [String(c.order), c.id, c.title_ar, c.title_en, c.level, c.prerequisites.join(", ") || "—", c.objectives_en.join(" • ")]), true));

sections.push(`<h2>B. Wording drafted by the assistant (needs your approval)</h2>
<h3>B1. Unit hook questions (shown at the start of each unit)</h3>` +
  table(["Unit", "Hook (ar)", "Hook (en)"], units.map((u) => [u.concept_id, u.hook_ar, u.hook_en]), true) +
  `<p class="note">Still to be supplied by a person (they state what Islam says, so they are not drafted): the "common misunderstanding and its fix" for each unit, and each unit's check question. They should be derived from the verified passages in section E.</p>
<h3>B2. Hand-off wording (shown when the app refers a question to a person)</h3>
<p class="note">Status in the file: verified = ${esc(refs.verified)}, reviewer = ${esc(refs.reviewed_by ?? "none")}. Until you approve, the app uses its built-in neutral wording (section B3).</p>` +
  table(["Situation", "Arabic", "English"], Object.entries(refs.referrals).map(([k, v]) => [k, v.ar, v.en]), true));

sections.push(`<h3>B3. Other learner-facing wording that touches religion, rulings, privacy or hand-off</h3>` +
  table(["Where (key)", "Arabic", "English"], SENSITIVE_UI.map((k) => [k, get(ar, k), get(en, k)]), true));

sections.push(`<h2>C. Question router (what the app answers, refers or declines)</h2>
<p>The router reads the <strong>question text only</strong>, never the person. Default when unsure: refer to a person. Please check especially the <strong>differing-views topics (L3)</strong>: the list below was derived only from the draft test cases and is certainly incomplete.</p>` +
  table(["Rule group", "What it triggers", "Patterns (Latin = word starts; Arabic = word starts with ال/و/ب… allowed)"], [
    ["crisis", "Decline + urgent human hand-off (L4)", rules.crisis.join(" · ")],
    ["invention", "Decline: requests to make up a hadith/verse (L4)", rules.invention.join(" · ")],
    ["fatwa", "Decline: requests for a ruling/fatwa (L4)", rules.fatwa.join(" · ")],
    ["personal", "Decline: personal situation (L4)", rules.personal.join(" · ")],
    ["sensitive_topics", "Decline: finance / politics / sect etc. (L4)", rules.sensitive_topics.join(" · ")],
    ["disputed_topics", "Refer: topics where scholars' views may differ (L3)  ← PLEASE EXTEND", rules.disputed_topics.join(" · ")],
    ["ruling_markers", "Refer when combined with a curriculum topic (L3)", rules.ruling_markers.join(" · ")],
    ["injection", "Never obeyed; flagged", rules.injection.join(" · ")],
  ], true) +
  `<h3>C2. Labelled test questions (${cases.length}) — please correct any wrong label</h3>
<p class="note">"Expected" is the label in the test set (ids 1–30 from the starter pack, others written by the implementer: all are drafts). "App result" is what the router does today. A mismatch or a wrong expected label matters most.</p>` +
  table(["id", "Question", "Expected", "App result", "Category"],
    cases.map((c) => { const d = routeQuestion(c.question); return [String(c.id), c.question, `${c.expected_action} / ${c.expected_level}`, `${d.action} / ${d.level}`, c.category]; }), true));

sections.push(`<h2>D. Video clips</h2><p>Rule: a clip is shown only with the creator's written permission, a credit, and captions checked by a person. Step times were read from frames only (±3 s): please confirm the order and number of washes against the source text.</p>` +
  videos.map((v) => `<h3>${esc(v.id)} — ${esc(v.title_ar)}</h3><p>Kind: ${esc(v.kind)} · permission: <strong>${esc(v.permission)}</strong> · creator credit: ${esc(v.creator_credit)} · timestamps verified: ${esc(v.timestamps_verified)}</p>` +
    (v.steps.length ? table(["Step", "Key", "Label", "From", "To", "Used", "Note"], v.steps.map((s) => [String(s.n), s.key, s.label_en, s.start, s.end, s.use ? "yes" : "no", s.note ?? ""]), true) : "<p>No steps (shown whole or reference only).</p>")).join(""));

sections.push(`<h2>E. Source passages (the only text the app quotes and cites)</h2>
<p>Each passage must be exactly as published at its source. Check the text against the link, then approve. ${passages.filter((p) => !p.text.startsWith("[CONTENT NEEDED")).length === 0 ? "<strong>No real passage has been added yet</strong>: the table lists the placeholders waiting to be filled." : ""}</p>` +
  table(["id", "Concept", "Lang", "Source · ID", "Link", "Text (verbatim)", "Verified now"],
    passages.map((p) => [p.id, p.concept_id, p.lang, `${p.source} · ${p.source_id}`, p.source_url, p.text, p.verified ? `yes (${p.verified_by})` : "no"]), true) +
  `<p class="note">After you approve, the team runs <code>verify:passages --by "Your name"</code>. Only then can learners see a passage.</p>`);

sections.push(`<h2>F. What your approval unlocks</h2>` + table(["You approve", "Then the team runs", "What changes for learners"], [
  ["Passages (E)", `npm run verify:passages -- --by "Name" --ids …`, "Explanations and practice can quote and cite them"],
  ["Unit hooks (B1)", `npm run verify:content -- units --by "Name"`, "The hook question appears at the start of each unit"],
  ["Hand-off wording (B2)", `npm run verify:content -- referrals --by "Name"`, "This wording replaces the built-in neutral default"],
  ["Router (C)", "edit content/router_rules.json and the eval labels", "Refer / decline behaviour matches your rulings"],
  ["Video (D)", "set permission, credit and timestamps in content/videos.json", "The clip plays with captions"],
]));

const font = (w: number, subset: string) => `@font-face{font-family:"Plex";font-weight:${w};src:url("file://${root}/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-${subset}-${w}-normal.woff2") format("woff2");unicode-range:${subset === "arabic" ? "U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF" : "U+0000-00FF"};}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ma'ālim review pack</title><style>
${[400, 700].flatMap((w) => [font(w, "arabic"), font(w, "latin")]).join("\n")}
@page{size:A4;margin:14mm}
body{font-family:"Plex",system-ui,sans-serif;font-size:10.5pt;line-height:1.5;color:#1F2933}
h1{color:#0F5E5A;font-size:20pt}h2{color:#0F5E5A;border-bottom:2px solid #C9A24B;padding-bottom:3px;margin-top:22px;page-break-after:avoid}h3{margin-bottom:4px;page-break-after:avoid}
table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:9pt}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top;text-align:start}th{background:#f1ece2}
td[dir=rtl]{font-size:10.5pt}.dec{width:120px;font-size:8.5pt;color:#444}.box{border:2px solid #0F5E5A;border-radius:8px;padding:6px 12px}.meta,.note{color:#52606D}
tr{page-break-inside:avoid}code{background:#f1ece2;padding:0 3px}
</style></head><body>${sections.join("\n")}</body></html>`;

const out = path.join(root, "review");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "REVIEW_PACK.html"), html);

async function main() {
  const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage();
  await page.goto(`file://${path.join(out, "REVIEW_PACK.html")}`);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(out, "REVIEW_PACK.pdf"), format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
  await browser.close();
  console.log("wrote review/REVIEW_PACK.html and review/REVIEW_PACK.pdf");
}
main();
