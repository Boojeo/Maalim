import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Explanation } from "@/components/explanation";
import { SOURCE_LABEL } from "@/components/citation-chip";
import { UnitPlayer } from "@/components/unit-player";
import { isLearnerUnit, needsBanner } from "@/lib/content-gate";
import { getStore } from "@/lib/data";
import { isPlaceholder, type Lang } from "@/lib/types";
import { resolveVideo } from "@/lib/videos";

export const dynamic = "force-dynamic";

export default async function UnitPage({ params }: { params: Promise<{ concept: string }> }) {
  const { concept: id } = await params;
  const store = getStore();
  const [concept, curriculum] = await Promise.all([store.getConcept(id), store.getCurriculum()]);
  if (!concept) notFound();

  const locale = (await getLocale()) as Lang;
  const t = await getTranslations("unit");
  const unit = await store.getUnit(id);
  const showDev = needsBanner();

  const learnerUnit = unit && isLearnerUnit(unit);
  const pick = (ar: string, en: string) => {
    const v = locale === "ar" ? ar : en;
    return v && (showDev || !isPlaceholder(v)) ? v : null;
  };
  const hook = learnerUnit && unit ? pick(unit.hook_ar, unit.hook_en) : null;
  const misconception = learnerUnit && unit ? pick(unit.misconception_ar, unit.misconception_en) : null;

  const allVideos = await store.getVideos(id);
  const wanted = unit ? unit.video_ids : [];
  const videos = allVideos.filter((v) => wanted.includes(v.id) && v.kind !== "reference").map((v) => resolveVideo(v));

  let passages = await store.getPassages({ conceptId: id, lang: locale, learner: true });
  if (passages.length === 0) passages = await store.getPassages({ conceptId: id, learner: true });

  let checkItem = null;
  let checkSource = null;
  if (unit?.check_item_id) {
    const items = await store.getItems({ conceptId: id, learner: true });
    checkItem = items.find((i) => i.id === unit.check_item_id) ?? null;
    if (checkItem?.source_passage_id) {
      const p = await store.getPassage(checkItem.source_passage_id);
      if (p) checkSource = { label: `${SOURCE_LABEL[p.source]} · ${p.source_id}`, url: p.source_url };
    }
  }

  const ordered = [...curriculum.concepts].sort((a, b) => a.order - b.order);
  const idx = ordered.findIndex((c) => c.id === id);
  const nextC = ordered[idx + 1] ?? null;

  return (
    <>
      {concept.objectives_en.length > 0 && locale === "en" ? (
        <details className="mb-4 text-sm text-muted">
          <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">{t("objectives")}</summary>
          <ul className="list-disc ps-5">
            {concept.objectives_en.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <UnitPlayer
        concept={concept}
        prerequisiteConcepts={curriculum.concepts.filter((c) => concept.prerequisites.includes(c.id))}
        hook={hook}
        misconception={misconception}
        videos={videos}
        explanation={<Explanation passages={passages} showDev={showDev} />}
        checkItem={checkItem}
        checkSource={checkSource}
        nextConcept={nextC ? { id: nextC.id, title: locale === "ar" ? nextC.title_ar : nextC.title_en } : null}
        showDev={showDev}
      />
    </>
  );
}
