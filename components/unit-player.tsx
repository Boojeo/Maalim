"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentPending } from "@/components/content-pending";
import { ItemPlayer, type ItemSource } from "@/components/item-player";
import { VideoPlayer } from "@/components/video-player";
import { markDone, markStarted, recordAttempt, unmetPrerequisites } from "@/lib/progress";
import { useProgress } from "@/lib/progress-client";
import { track } from "@/lib/telemetry";
import { isPlaceholder, type Concept, type Item, type Lang } from "@/lib/types";
import type { ResolvedVideo } from "@/lib/videos";

export interface UnitPlayerProps {
  concept: Concept;
  prerequisiteConcepts: Concept[];
  hook: string | null; // already gated server-side (null => pending)
  misconception: string | null;
  videos: ResolvedVideo[];
  explanation: React.ReactNode;
  checkItem: Item | null;
  checkSource: ItemSource | null;
  nextConcept: { id: string; title: string } | null;
  showDev: boolean;
}

const STEPS = ["hook", "video", "explanation", "check", "wrapup"] as const;
type Step = (typeof STEPS)[number];

export function UnitPlayer(p: UnitPlayerProps) {
  const t = useTranslations("unit");
  const locale = useLocale() as Lang;
  const { state, update } = useProgress();
  const [i, setI] = useState(0);
  const step: Step = STEPS[i];
  const title = locale === "ar" ? p.concept.title_ar : p.concept.title_en;

  useEffect(() => {
    update((s) => markStarted(s, p.concept.id));
  }, [p.concept.id, update]);

  const unmet = useMemo(
    () => p.prerequisiteConcepts.filter((c) => unmetPrerequisites(p.concept, state).includes(c.id)),
    [p.concept, p.prerequisiteConcepts, state],
  );
  const name = (c: Concept) => (locale === "ar" ? c.title_ar : c.title_en);
  const done = state.concepts[p.concept.id]?.done;

  const pending = (raw?: string) => <ContentPending showRaw={p.showDev} raw={raw} />;

  return (
    <article className="space-y-5" aria-labelledby="unit-title">
      <header className="space-y-1">
        <h1 id="unit-title" className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted" id="unit-step">
          {t("stepOf", { n: i + 1, total: STEPS.length })}
        </p>
        <div
          role="progressbar"
          aria-label={t("progress")}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={i + 1}
          className="h-2 overflow-hidden rounded-full bg-accent-soft"
        >
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((i + 1) / STEPS.length) * 100}%` }} />
        </div>
      </header>

      {unmet.length > 0 ? (
        <p role="note" className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">
          {t("buildsOn", { list: unmet.map(name).join(locale === "ar" ? "، " : ", ") })}
        </p>
      ) : null}

      <Card className="space-y-4" aria-live="polite">
        <h2 className="text-lg font-bold text-primary">{t(step)}</h2>

        {step === "hook" && (p.hook ? <p className="text-lg">{p.hook}</p> : pending("[CONTENT NEEDED: hook question]"))}

        {step === "video" &&
          (p.videos.length > 0 ? (
            <div className="space-y-4">
              {p.videos.map((v) => (
                <VideoPlayer key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <VideoPlayer
              video={{ id: "none", kind: "lesson", title_ar: "", credit: null, creditPending: true, blocked: "missing-file", clips: [], fullSrc: null, captions: {} }}
            />
          ))}

        {step === "explanation" && p.explanation}

        {step === "check" &&
          (p.checkItem ? (
            <ItemPlayer
              item={p.checkItem}
              source={p.checkSource}
              onResult={(ok) => {
                update((s) => recordAttempt(s, p.concept.id, ok));
                track(p.concept.id, ok ? "check_correct" : "check_wrong");
              }}
              onContinue={() => setI(i + 1)}
            />
          ) : (
            pending("[CONTENT NEEDED: approved check question]")
          ))}

        {step === "wrapup" && (p.misconception && !isPlaceholder(p.misconception) ? <p>{p.misconception}</p> : pending("[CONTENT NEEDED: misconception and fix]"))}
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0} className="flex-1">
          {t("previous")}
        </Button>
        {i < STEPS.length - 1 ? (
          <Button onClick={() => setI(i + 1)} className="flex-1">
            {t("next")}
          </Button>
        ) : (
          <Button
            onClick={() => {
              update((s) => markDone(s, p.concept.id));
              track(p.concept.id, "unit_done");
            }}
            disabled={!!done}
            className="flex-1"
          >
            {done ? t("finished") : t("finish")}
          </Button>
        )}
      </div>

      {done && i === STEPS.length - 1 ? (
        <div className="flex flex-col gap-2">
          {p.nextConcept ? (
            <Button asChild>
              <Link href={`/learn/${p.nextConcept.id}`}>{t("nextUnit")}: {p.nextConcept.title}</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/">{t("backToMap")}</Link>
          </Button>
        </div>
      ) : null}
    </article>
  );
}
