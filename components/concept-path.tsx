"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, Lock, Play } from "lucide-react";
import { conceptStatus, nextConcept, unmetPrerequisites, type ConceptStatus } from "@/lib/progress";
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
  const next = nextConcept(concepts, state);

  return (
    <div className="space-y-4">
      {next ? (
        <p className="text-sm text-muted">{t("next", { title: name(next) })}</p>
      ) : (
        <p className="font-medium text-success">{t("allDone")}</p>
      )}
      <ol aria-label={t("pathLabel")} className="relative space-y-4">
        {ordered.map((c, idx) => {
          const status: ConceptStatus = conceptStatus(c, state);
          const Icon = ICON[status];
          const unmet = unmetPrerequisites(c, state);
          const action = status === "done" ? t("review") : status === "in_progress" ? t("continue") : t("start");
          const prereqText = c.prerequisites.map((r) => name(byId.get(r)!)).join(locale === "ar" ? "، " : ", ");
          return (
            <li key={c.id} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-full border-2 text-ink",
                    status === "done" && "border-accent bg-accent",
                    status === "in_progress" && "border-primary bg-surface ring-4 ring-accent-soft",
                    status === "available" && "border-primary bg-surface",
                    status === "locked" && "border-line bg-bg",
                  )}
                >
                  <Icon className={cn("size-5", status === "locked" ? "text-muted" : "text-ink")} />
                </span>
                {idx < ordered.length - 1 ? <span aria-hidden className="mt-1 w-0.5 flex-1 bg-line" /> : null}
              </div>
              <Link
                href={`/learn/${c.id}`}
                data-status={status}
                className={cn(
                  "mb-1 block min-h-11 flex-1 rounded-[var(--radius-card)] border bg-surface p-4 shadow-sm",
                  status === "locked" ? "border-line" : "border-primary",
                )}
              >
                <span className="text-sm font-medium text-muted">{c.level}</span>
                <span className="block text-lg font-bold">{name(c)}</span>
                <span className={cn("mt-1 inline-block text-sm font-medium", status === "locked" ? "text-muted" : "text-primary")}>
                  {t(`status.${status}`)} · {action}
                </span>
                {c.prerequisites.length > 0 ? (
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
