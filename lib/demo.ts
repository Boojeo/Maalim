// DEMO mode (DEMO_CONTENT=1): illustration content for the wudu clip only.
// Nothing here is religious content written by the model: every question is built mechanically
// from the ORDER of the steps listed in content/videos.json (what the clip shows). Step names are
// short neutral labels. All of it is unreviewed and is shown under a permanent "DEMO" banner.
import type { Item, Lang, VideoEntry, VideoStep } from "./types";

export function demoEnabled(): boolean {
  return process.env.DEMO_CONTENT === "1";
}

/** Draft Arabic step labels (neutral action names for the reviewer to confirm). English comes from videos.json. */
const AR_LABEL: Record<string, string> = {
  hands: "غسل اليدين",
  "mouth-nose": "المضمضة والاستنشاق",
  face: "غسل الوجه",
  arms: "غسل الذراعين",
  head: "مسح الرأس",
  feet: "غسل القدمين",
};

export function stepLabel(s: Pick<VideoStep, "key" | "label_en">, lang: Lang): string {
  return lang === "ar" ? (AR_LABEL[s.key] ?? s.label_en) : s.label_en;
}

export const usedSteps = (v: VideoEntry): VideoStep[] => v.steps.filter((s) => s.use).sort((a, b) => a.n - b.n);

const tx = {
  en: {
    after: (x: string) => `In the clip, which step comes right after “${x}”?`,
    last: "In the clip, which step is shown last?",
    order: "Put the steps in the order the clip shows them.",
    afterSpan: (a: string, b: string) => `In the clip, “${b}” comes right after “${a}”.`,
    lastSpan: (x: string) => `In the clip, “${x}” is the last step shown.`,
    orderSpan: (all: string[]) => `Order shown in the clip: ${all.join(" → ")}.`,
    src: (n: number) => `Clip step ${n}`,
  },
  ar: {
    after: (x: string) => `في المقطع، ما الخطوة التي تأتي مباشرة بعد «${x}»؟`,
    last: "في المقطع، ما آخر خطوة تُعرض؟",
    order: "رتّب الخطوات كما يعرضها المقطع.",
    afterSpan: (a: string, b: string) => `في المقطع تأتي «${b}» مباشرة بعد «${a}».`,
    lastSpan: (x: string) => `في المقطع «${x}» هي آخر خطوة تُعرض.`,
    orderSpan: (all: string[]) => `الترتيب في المقطع: ${all.join(" ← ")}.`,
    src: (n: number) => `خطوة المقطع ${n}`,
  },
} as const;

export interface DemoEntry {
  item: Item;
  source: { label: string; url: null };
}

/** One question per step (what comes next / last) plus one ordering question over all steps. */
export function buildDemoItems(video: VideoEntry, lang: Lang): DemoEntry[] {
  const steps = usedSteps(video);
  const T = tx[lang];
  const label = (s: VideoStep) => stepLabel(s, lang);
  const base = { concept_id: video.concept_id, lang, source_passage_id: null, video_id: video.id, status: "draft" as const, generated_by: "demo-from-clip", reviewed_by: null, reviewed_on: null };
  const out: DemoEntry[] = [];

  steps.forEach((s, i) => {
    const next = steps[i + 1];
    const correct = next ?? s;
    // deterministic option set: the correct step + two other steps, in step order
    const others = steps.filter((x) => x.n !== correct.n && x.n !== s.n).slice(0, 2);
    const opts = [correct, ...others].sort((a, b) => a.n - b.n);
    out.push({
      item: {
        ...base,
        id: `demo-${video.id}-${s.n}`,
        type: "mcq",
        prompt: next ? T.after(label(s)) : T.last,
        options: opts.map((o) => ({ id: `s${o.n}`, text: label(o) })),
        answer: `s${correct.n}`,
        source_span: next ? T.afterSpan(label(s), label(next)) : T.lastSpan(label(s)),
      },
      source: { label: T.src(s.n), url: null },
    });
  });

  out.push({
    item: {
      ...base,
      id: `demo-${video.id}-order`,
      type: "order",
      prompt: T.order,
      options: steps.map((s) => ({ id: `s${s.n}`, text: label(s) })),
      answer: steps.map((s) => `s${s.n}`),
      source_span: T.orderSpan(steps.map(label)),
    },
    source: { label: video.id, url: null },
  });
  return out;
}
