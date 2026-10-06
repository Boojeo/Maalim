"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, Hourglass, Lock, Play } from "lucide-react";
import { conceptStatus, recommend, unmetPrerequisites, type ConceptStatus } from "@/lib/progress";
import { useProgress } from "@/lib/progress-client";
import { cn } from "@/lib/utils";
import type { Concept, Lang } from "@/lib/types";

const ICON = { locked: Lock, available: Play, in_progress: Play, done: Check } as const;

/** Vertical path of landmarks (F1). Locked landmarks stay tappable: the unit shows a calm "builds on" note. */
export function ConceptPath({ concepts }: { concepts: Concept[] }) {
  const t = useTranslations("map");
  const locale = useLocale() as Lang;
  const { state } = useProgress();
  const name = (c: Concept) => (locale === "ar" ? c.title_ar : c.title_en);
  const ordered = [...concepts].sort((a, b) => a.order - b.order);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const next = recommend(concepts, state).primary;
  const hasFuture = concepts.some((c) => c.availability === "future");

  return (
    <div className="space-y-4">
      {next ? (
        <p className="text-sm text-muted">{t("next", { title: name(next) })}</p>
      ) : (
        <p className="font-medium text-success">{t("allDone")}</p>
      )}
      {hasFuture ? <p role="note" className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">{t("available")}</p> : null}
      <ol aria-label={t("pathLabel")} className="relative space-y-4">
        {ordered.map((c, idx) => {
          const future = c.availability === "future";
          const status: ConceptStatus = conceptStatus(c, state);
          const Icon = future ? Hourglass : ICON[status];
          const unmet = unmetPrerequisites(c, state);
          const action = status === "done" ? t("review") : status === "in_progress" ? t("continue") : t("start");
          const prereqText = c.prerequisites.map((r) => name(byId.get(r)!)).join(locale === "ar" ? "، " : ", ");
          return (
            <li key={c.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-14 shrink-0 place-items-center rounded-full border-[3px] border-outline text-ink",
                    status === "done" && "bg-accent shadow-btn",
                    status === "in_progress" && "bg-primary text-primary-fg shadow-btn ring-4 ring-accent-soft",
                    status === "available" && "bg-surface shadow-btn",
                    (status === "locked" || future) && "border-line bg-bg",
                  )}
                >
                  <Icon className={cn("size-6", status === "locked" || future ? "text-muted" : status === "in_progress" ? "text-primary-fg" : "text-ink")} />
                </span>
                {idx < ordered.length - 1 ? <span aria-hidden className="mt-1 w-0.5 flex-1 bg-line" /> : null}
              </div>
              <Link
                href={`/learn/${c.id}`}
                data-status={status}
                className={cn(
                  "mb-1 block min-h-11 flex-1 rounded-[var(--radius-card)] border-[3px] bg-surface p-4",
                  future ? "border-dashed border-line" : status === "locked" ? "border-line" : "border-outline shadow-hard",
                )}
              >
                <span className="text-sm font-medium text-muted">{c.level}</span>
                <span className="block text-lg font-bold">{name(c)}</span>
                {future ? (
                  <span className="mt-1 inline-block rounded-full bg-accent-soft px-3 py-0.5 text-sm font-bold text-ink">{t("future")}</span>
                ) : (
                  <span className={cn("mt-1 inline-block text-sm font-medium", status === "locked" ? "text-muted" : "text-primary")}>
                    {t(`status.${status}`)} · {action}
                  </span>
                )}
                {!future && c.prerequisites.length > 0 ? (
                  <span className={cn("mt-1 block text-sm", unmet.length ? "text-ink" : "text-muted")}>
                    {t("after", { list: prereqText })}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
