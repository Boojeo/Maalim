import { getLocale, getTranslations } from "next-intl/server";
import { SOURCE_LABEL } from "@/components/citation-chip";
import { PracticeSession, type PracticeEntry } from "@/components/practice-session";
import { getStore } from "@/lib/data";
import { futureConceptIds } from "@/lib/availability";
import { buildDemoItems, demoEnabled } from "@/lib/demo";
import type { Lang } from "@/lib/types";
import { resolveVideo } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function PractisePage() {
  const t = await getTranslations("practise");
  const locale = (await getLocale()) as Lang;
  const store = getStore();

  // Approved items only. Prefer the UI language; fall back to whatever approved items exist.
  const all = await store.getItems({ learner: true });
  const mine = all.filter((i) => i.lang === locale);
  const items = mine.length > 0 ? mine : all;

  const entries: PracticeEntry[] = [];
  for (const item of items) {
    const p = item.source_passage_id ? await store.getPassage(item.source_passage_id) : null;
    let video = null;
    if (item.video_id) {
      const v = (await store.getVideos(item.concept_id)).find((x) => x.id === item.video_id);
      video = v ? resolveVideo(v) : null;
    }
    entries.push({
      item,
      source: p ? { label: `${SOURCE_LABEL[p.source]} · ${p.source_id}`, url: p.source_url } : null,
      video,
    });
  }

  const demo = demoEnabled();
  if (demo) {
    const wudu = (await store.getVideos("wudu")).find((v) => v.kind === "lesson" && v.permission === "granted");
    if (wudu) for (const d of buildDemoItems(wudu, locale)) entries.push({ item: d.item, source: d.source, video: null });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      {demo && entries.length > 0 ? <p role="note" className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">{t("demoNote")}</p> : null}
      {futureConceptIds().length > 0 ? (
        <p role="note" className="rounded-[var(--radius-btn)] border-[3px] border-dashed border-line p-3 text-sm">{t("future")}</p>
      ) : null}
      {entries.length === 0 ? (
        <>
          <p className="text-muted">{t("empty")}</p>
          <p className="text-sm text-muted">{t("emptyHint")}</p>
        </>
      ) : (
        <PracticeSession entries={entries} />
      )}
    </section>
  );
}
