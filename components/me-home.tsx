"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { mastery, setStage, type ProgressState } from "@/lib/progress";
import { useProgress } from "@/lib/progress-client";
import { setShareEnabled, shareEnabled } from "@/lib/telemetry";
import type { Lang } from "@/lib/types";

const subscribeNone = () => () => undefined;

export function MeHome({ concepts, locale }: { concepts: { id: string; title_ar: string; title_en: string; order: number }[]; locale: Lang }) {
  const t = useTranslations("me");
  const { state, update, reset } = useProgress();
  const [shareTick, setShareTick] = useState(0);
  // localStorage-backed value read without a state-in-effect; re-read after toggling.
  const share = useSyncExternalStore(subscribeNone, () => `${shareTick}:${shareEnabled()}`, () => "0:false").endsWith(":true");

  return (
    <div className="space-y-6">
      <p className="text-muted">{t("privacy")}</p>

      <Card className="space-y-3">
        <fieldset className="space-y-2">
          <legend className="text-lg font-bold">{t("stage")}</legend>
          <p className="text-sm text-muted">{t("stageHint")}</p>
          {([0, 1, 2, 3] as const).map((s) => (
            <label key={s} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-btn)] border border-line px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-accent-soft">
              <input type="radio" name="stage" checked={state.stage === s} onChange={() => update((p) => setStage(p, s))} className="size-5 accent-[var(--color-primary)]" />
              {t(`stages.${s}`)}
            </label>
          ))}
        </fieldset>
      </Card>

      <section className="space-y-2" aria-labelledby="progress-h">
        <h2 id="progress-h" className="text-lg font-bold">{t("progress")}</h2>
        <ul className="space-y-2">
          {[...concepts].sort((a, b) => a.order - b.order).map((c) => (
            <li key={c.id}>
              <ProgressRow state={state} id={c.id} title={locale === "ar" ? c.title_ar : c.title_en} />
            </li>
          ))}
        </ul>
      </section>

      <Card className="space-y-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={share}
            onChange={(e) => {
              setShareEnabled(e.target.checked);
              setShareTick((n) => n + 1);
            }}
            className="size-5 accent-[var(--color-primary)]"
          />
          <span className="font-medium">{t("share")}</span>
        </label>
        <p className="text-sm text-muted">{t("shareHint")}</p>
      </Card>

      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link href="/ask">{t("ask")}</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            if (window.confirm(t("resetConfirm"))) reset();
          }}
        >
          {t("reset")}
        </Button>
      </div>
    </div>
  );
}

function ProgressRow({ state, id, title }: { state: ProgressState; id: string; title: string }) {
  const t = useTranslations("me");
  const m = mastery(state, id);
  const done = state.concepts[id]?.done;
  return (
    <div className="rounded-[var(--radius-btn)] border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        {done ? <span className="text-sm font-medium text-success">{t("done")}</span> : null}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-accent-soft" role="img" aria-label={m === null ? t("masteryNone") : t("mastery", { pct: Math.round(m * 100) })}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${m === null ? 0 : Math.round(m * 100)}%` }} />
      </div>
      <p className="mt-1 text-sm text-muted">{m === null ? t("masteryNone") : t("mastery", { pct: Math.round(m * 100) })}</p>
    </div>
  );
}
