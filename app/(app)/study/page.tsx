import { getLocale, getTranslations } from "next-intl/server";
import { SOURCE_LABEL } from "@/components/citation-chip";
import { StudyFlow, type StudyTopic } from "@/components/study-flow";
import { needsBanner } from "@/lib/content-gate";
import { getStore } from "@/lib/data";
import { MIN_ITEMS_FOR_STUDY } from "@/lib/study";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const t = await getTranslations("study");
  const locale = (await getLocale()) as Lang;
  const store = getStore();
  const { concepts } = await store.getCurriculum();
  const approved = await store.getItems({ learner: true });

  const topics: StudyTopic[] = [];
  for (const c of [...concepts].sort((a, b) => a.order - b.order)) {
    const own = approved.filter((i) => i.concept_id === c.id);
    const items = own.filter((i) => i.lang === locale).length >= MIN_ITEMS_FOR_STUDY ? own.filter((i) => i.lang === locale) : own;
    if (items.length < MIN_ITEMS_FOR_STUDY) continue;
    const sources: StudyTopic["sources"] = {};
    for (const i of items) {
      const p = i.source_passage_id ? await store.getPassage(i.source_passage_id) : null;
      sources[i.id] = p ? { label: `${SOURCE_LABEL[p.source]} · ${p.source_id}`, url: p.source_url } : null;
    }
    let passages = await store.getPassages({ conceptId: c.id, lang: locale, learner: true });
    if (passages.length === 0) passages = await store.getPassages({ conceptId: c.id, learner: true });
    topics.push({ id: c.id, title: locale === "ar" ? c.title_ar : c.title_en, items, sources, passages });
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <StudyFlow topics={topics} showDev={needsBanner()} />
    </section>
  );
}
