"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { conceptStatus, recommend } from "@/lib/progress";
import { useProgress } from "@/lib/progress-client";
import type { Concept, Lang } from "@/lib/types";

export function LearnHome({ concepts, locale }: { concepts: Concept[]; locale: Lang }) {
  const t = useTranslations("learn");
  const m = useTranslations("map");
  const { state } = useProgress();
  const name = (c: Concept) => (locale === "ar" ? c.title_ar : c.title_en);
  const rec = recommend(concepts, state);
  const next = rec.primary;
  return (
    <div className="space-y-6">
      {next ? (
        <Card className="space-y-3">
          <h2 className="text-sm font-bold text-muted">{t("continue")}</h2>
          <p className="text-xl font-bold">{name(next)}</p>
          <Button asChild className="w-full">
            <Link href={`/learn/${next.id}`}>{state.concepts[next.id]?.started ? m("continue") : m("start")}</Link>
          </Button>
        </Card>
      ) : (
        <p className="font-medium text-success">{m("allDone")}</p>
      )}
      {rec.review ? (
        <Card className="space-y-2">
          <h2 className="text-sm font-bold text-muted">{t("review")}</h2>
          <p className="text-lg font-bold">{name(rec.review)}</p>
          <p className="text-sm text-muted">{t("reviewBody")}</p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/learn/${rec.review.id}`}>{t("reviewCta")}</Link>
          </Button>
        </Card>
      ) : null}
      <Button asChild variant="ghost" className="w-full">
        <Link href="/ask">{t("ask")}</Link>
      </Button>
      <div className="space-y-2">
        <h2 className="text-lg font-bold">{t("all")}</h2>
        <ul className="space-y-2">
          {[...concepts].sort((a, b) => Number(a.availability === "future") - Number(b.availability === "future") || a.order - b.order).map((c) =>
            c.availability === "future" ? (
              <li key={c.id} className="flex min-h-11 items-center justify-between rounded-[var(--radius-btn)] border-[3px] border-dashed border-line bg-bg px-4 py-2 text-muted">
                <span>{name(c)}</span>
                <span className="text-sm font-bold">{m("futureShort")}</span>
              </li>
            ) : (
              <li key={c.id}>
                <Link href={`/learn/${c.id}`} className="flex min-h-11 items-center justify-between rounded-[var(--radius-btn)] border-[3px] border-outline bg-surface px-4 py-2">
                  <span>{name(c)}</span>
                  <span className="text-sm text-muted">{m(`status.${conceptStatus(c, state)}`)}</span>
                </Link>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
