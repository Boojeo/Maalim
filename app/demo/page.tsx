import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { contentStatus } from "@/lib/content-status";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Demo script", robots: { index: false } };
export const dynamic = "force-dynamic";

interface Latest {
  router: { subsets: { name: string; n: number; runs: { actionAccuracy: number; safeHandlingRecallL3L4: number; unsafeAnswers: number }[] }[] };
  explain: { citationCoverage: number; textAgreement: number; unverifiedLeaks: number };
  stress: { total: number; dropped: number };
  llm: { provider: string; model: string };
  runs: number;
}

function latest(): Latest | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "eval", "results", "latest.json"), "utf8")) as Latest;
  } catch {
    return null;
  }
}

const q = encodeURIComponent("My wife and I are fighting, should we divorce?");

const STEPS = [
  { t: "0:00", title: "The problem (30 s)", href: "/", say: "Maria, a caregiver in Riyadh, has just become Muslim. She does not read Arabic yet and has 15 minutes a day on her phone. Open the app in Arabic (RTL, the default), switch to English, and point out the self-declared stage and the 'nothing is stored about you' line.", real: "Map, language switch, welcome card" },
  { t: "0:30", title: "Map → Wudu unit (1 min)", href: "/learn/wudu", say: "Tap the wudu landmark (prerequisites are visible; it stays open with a calm note). Walk hook → video with Arabic/English captions → explanation. Tap a citation chip to open the verbatim source. Say: every sentence is cited, and sentences the guard cannot support are removed.", real: "Unit player, citation guard, chips. The clip plays only once its creator has granted permission and captions exist" },
  { t: "1:30", title: "Practice: 'Dhuhr at work' (1 min)", href: "/practise", say: "Give a wrong answer on purpose. The fix shows the verbatim source span and its source, never a harsh error. Mention that only reviewer-approved items appear here.", real: "Approved items only; reviewer queue at /admin/review" },
  { t: "2:30", title: "A personal question → refer (1 min)", href: `/ask?q=${q}`, say: "Press Ask. The router classifies the question, not the person: this is personal (L4), so we do not answer. Press 'Talk to a person', show the editable preview of exactly what a mentor would see, then Send. Point out that contact details are refused and nothing identifies Maria.", real: "Router, preview-before-send, anonymous referral" },
  { t: "3:30", title: "Mentor dashboard (45 s)", href: "/mentor", say: "Open the dashboard (token required). The referral arrived with only the consented summary. Aggregates hide counts below 3 so nobody can be singled out.", real: "Inbox + anonymised aggregates. Load synthetic rows with `npm run seed:demo` if needed" },
  { t: "4:15", title: "Results (45 s)", href: "#results", say: "Show the numbers below, and say plainly which are measured on mock adapters and which labels are still draft.", real: "npm run eval → EVAL.md" },
];

export default async function DemoPage() {
  const status = contentStatus();
  const store = getStore();
  const verified = status.reduce((n, r) => n + r.verified, 0);
  const grantedVideos = status.reduce((n, r) => n + r.videos.filter((v) => v.permission === "granted").length, 0);
  const approvedItems = (await store.getItems({ learner: true })).length;
  const res = latest();
  const all = res?.router.subsets.find((s) => s.name === "all");
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-6" dir="ltr" lang="en">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Demo script · 5 minutes</h1>
        <p className="text-muted">The story from PLAN.md: Maria → map → wudu → practice → personal question → mentor → results.</p>
      </header>

      <section aria-labelledby="ready-h" className="space-y-2 rounded-[var(--radius-card)] border border-line bg-surface p-4">
        <h2 id="ready-h" className="text-lg font-bold">Is the demo ready? (live status)</h2>
        <ul className="list-disc space-y-1 ps-5">
          <li>Verified passages: <strong>{verified}</strong> {verified === 0 ? "(the explanation step will show &ldquo;waiting for review&rdquo;)" : ""}</li>
          <li>Video clips with permission granted: <strong>{grantedVideos}</strong> {grantedVideos === 0 ? "(a labelled placeholder will show instead of a clip)" : ""}</li>
          <li>Approved practice items: <strong>{approvedItems}</strong> {approvedItems === 0 ? "(the practice screen will be empty)" : ""}</li>
          <li>Data store: <strong>{store.kind}</strong> {store.kind === "local" ? "(referrals do not survive a cold start on Vercel: configure Supabase before presenting)" : ""}</li>
        </ul>
        <p className="text-sm text-muted">Nothing unverified may appear in the final demo. See STATUS.md, &ldquo;Content needed&rdquo;.</p>
      </section>

      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.t} className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p className="text-sm font-bold text-primary">{s.t}</p>
            <h2 className="text-lg font-bold">{s.title}</h2>
            <p className="mt-1">{s.say}</p>
            <p className="mt-1 text-sm text-muted">What is real here: {s.real}</p>
            <p className="mt-2">
              <Link href={s.href} className="inline-flex min-h-11 items-center font-medium text-primary underline">
                Open
              </Link>
            </p>
          </li>
        ))}
      </ol>

      <section id="results" aria-labelledby="res-h" className="space-y-2">
        <h2 id="res-h" className="text-xl font-bold">Results (from the last <code>npm run eval</code>)</h2>
        {res && all ? (
          <>
            <ul className="list-disc space-y-1 ps-5">
              <li>Router, {all.n} labelled cases: action accuracy {pct(all.runs[0].actionAccuracy)}, L3/L4 safe handling {pct(all.runs[0].safeHandlingRecallL3L4)}, unsafe answers {all.runs[0].unsafeAnswers}.</li>
              <li>Explainer: citation coverage {pct(res.explain.citationCoverage)}, unverified passages shown {res.explain.unverifiedLeaks}, identical output across {res.runs} runs {pct(res.explain.textAgreement)}.</li>
              <li>Citation guard stress test: {res.stress.dropped} of {res.stress.total} bad sentences dropped.</li>
            </ul>
            <p className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">
              Say this out loud: these were measured with the <strong>{res.llm.provider}</strong> adapter ({res.llm.model}). Router labels are drafts awaiting the Sharia reviewer, the rules were tuned on them, and on 25 unseen paraphrases the first version of the router was wrong 5 times (all too permissive). Details in EVAL.md.
            </p>
          </>
        ) : (
          <p>No results yet: run <code>npm run eval</code>.</p>
        )}
      </section>

      <section aria-labelledby="bp-h" className="space-y-2">
        <h2 id="bp-h" className="text-xl font-bold">Built vs proposed (label this on the slide)</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="py-2 pe-3 text-start">Built and working</th>
              <th scope="col" className="py-2 text-start">Proposed / needs people</th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="py-2 pe-3">Concept map, unit player, captions, citation guard, scope router, approved-only practice, reviewer queue with auto-check, preview-before-send handoff, anonymous mentor dashboard, eval harness</td>
              <td className="py-2">Sharia-verified passages and unit text, creator permissions and captions for clips, independent router labels, a real LLM and embedding model, a mentor follow-up channel, Tagalog/Urdu, the A/B pre/post test</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
