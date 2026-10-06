"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentPending } from "@/components/content-pending";
import { ItemPlayer, type ItemSource } from "@/components/item-player";
import { randomGroup, useStudyRun } from "@/lib/study-client";
import { splitItems } from "@/lib/study";
import type { Item, Passage } from "@/lib/types";
import { SOURCE_LABEL } from "@/components/citation-chip";

export interface StudyTopic {
  id: string;
  title: string;
  items: Item[];
  sources: Record<string, ItemSource | null>;
  passages: Passage[];
}

function Quiz({ items, sources, onFinish }: { items: Item[]; sources: Record<string, ItemSource | null>; onFinish: (correct: number, total: number) => void }) {
  const t = useTranslations("study");
  const [i, setI] = useState(0);
  const correct = useRef(0);
  const item = items[i];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("item", { n: i + 1, total: items.length })}</p>
      <Card>
        <ItemPlayer
          key={item.id}
          item={item}
          source={sources[item.id] ?? null}
          quiet
          onResult={(ok) => {
            if (ok) correct.current += 1;
          }}
          onContinue={() => (i + 1 >= items.length ? onFinish(correct.current, items.length) : setI(i + 1))}
        />
      </Card>
    </div>
  );
}

/** Optional anonymous A/B study: pre-test, learn (A static page / B unit), post-test. Nothing identifies the participant. */
export function StudyFlow({ topics, showDev }: { topics: StudyTopic[]; showDev: boolean }) {
  const t = useTranslations("study");
  const locale = useLocale();
  const { run, set } = useStudyRun();
  const [choice, setChoice] = useState(topics[0]?.id ?? "");

  if (topics.length === 0) {
    return (
      <div className="space-y-3">
        <p>{t("notEnough")}</p>
        <ContentPending showRaw={showDev} raw="[CONTENT NEEDED: approved practice items (at least 2 per topic)]" />
      </div>
    );
  }

  if (!run) {
    return (
      <Card className="space-y-4">
        <p>{t("intro")}</p>
        <fieldset className="space-y-2">
          <legend className="font-bold">{t("topic")}</legend>
          {topics.map((tp) => (
            <label key={tp.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-btn)] border-[3px] border-outline px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-accent-soft">
              <input type="radio" name="topic" value={tp.id} checked={choice === tp.id} onChange={() => setChoice(tp.id)} className="size-5 accent-[var(--color-primary)]" />
              {tp.title}
            </label>
          ))}
        </fieldset>
        <Button className="w-full" onClick={() => set({ group: randomGroup(), conceptId: choice, phase: "pre", pre: null })}>
          {t("start")}
        </Button>
      </Card>
    );
  }

  const topic = topics.find((x) => x.id === run.conceptId);
  if (!topic) return <Button onClick={() => set(null)}>{t("start")}</Button>;
  const { pre, post } = splitItems(topic.items);

  if (run.phase === "pre") {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t("preTitle")}</h2>
        <p className="text-muted">{t("preBody")}</p>
        <Quiz items={pre} sources={topic.sources} onFinish={(c, n) => set({ ...run, phase: "learn", pre: { correct: c, total: n } })} />
      </div>
    );
  }

  if (run.phase === "learn") {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">{t("learnTitle")}</h2>
        {run.group === "A" ? (
          <Card className="space-y-3">
            <p className="text-muted">{t("learnA")}</p>
            {topic.passages.length === 0 ? (
              <p>{t("noPassages")}</p>
            ) : (
              topic.passages.map((p) => (
                <div key={p.id} lang={p.lang} dir={p.lang === "ar" ? "rtl" : "ltr"} className="space-y-1">
                  <p>{p.text}</p>
                  <p className="text-sm text-muted" dir="ltr">{SOURCE_LABEL[p.source]} · {p.source_id}</p>
                </div>
              ))
            )}
          </Card>
        ) : (
          <Card className="space-y-3">
            <p className="text-muted">{t("learnB")}</p>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/learn/${topic.id}`}>{t("openUnit")}</Link>
            </Button>
          </Card>
        )}
        <Button className="w-full" onClick={() => set({ ...run, phase: "post" })}>
          {t("toPost")}
        </Button>
      </div>
    );
  }

  if (run.phase === "post") {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">{t("postTitle")}</h2>
        <Quiz
          items={post}
          sources={topic.sources}
          onFinish={(c, n) => {
            void fetch("/api/study", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ group: run.group, conceptId: run.conceptId, preCorrect: run.pre?.correct ?? 0, preTotal: run.pre?.total ?? 1, postCorrect: c, postTotal: n }),
            }).catch(() => undefined);
            set({ ...run, phase: "done" });
          }}
        />
      </div>
    );
  }

  return (
    <Card className="space-y-3" role="status">
      <h2 className="text-lg font-bold">{t("doneTitle")}</h2>
      <p>{t("doneBody")}</p>
      <Button asChild className="w-full">
        <Link href="/me" onClick={() => set(null)} lang={locale}>{t("again")}</Link>
      </Button>
    </Card>
  );
}
