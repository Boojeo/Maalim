"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeItem, seededOrder, type Response } from "@/lib/practice";
import type { Item } from "@/lib/types";

export interface ItemSource {
  label: string; // e.g. "HadeethEnc · 1234"
  url: string | null;
}

/** MCQ / ordering / scenario player. A wrong answer shows the verbatim source span, never a harsh error. */
export function ItemPlayer({
  item,
  source,
  onResult,
  onContinue,
  quiet = false,
}: {
  item: Item;
  source: ItemSource | null;
  onResult?: (correct: boolean) => void;
  onContinue?: () => void;
  /** Test mode (study): no feedback is shown and the item moves on at once, so the test does not teach. */
  quiet?: boolean;
}) {
  const t = useTranslations("item");
  const dir = item.lang === "ar" ? "rtl" : "ltr";
  const [choice, setChoice] = useState<string | null>(null);
  const [order, setOrder] = useState<string[]>(() =>
    seededOrder(item.options.map((o) => o.id), item.id),
  );
  const [result, setResult] = useState<boolean | null>(null);
  const text = (id: string) => item.options.find((o) => o.id === id)?.text ?? id;

  function submit() {
    const response: Response = item.type === "mcq" ? (choice ?? "") : order;
    const ok = gradeItem(item, response);
    onResult?.(ok);
    if (quiet) return onContinue?.();
    setResult(ok);
  }
  function move(i: number, d: -1 | 1) {
    setOrder((o) => {
      const next = [...o];
      const j = i + d;
      if (j < 0 || j >= next.length) return o;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function retry() {
    setResult(null);
    setChoice(null);
  }

  const locked = result !== null;
  return (
    <div className="space-y-4" lang={item.lang} dir={dir}>
      <p className="text-lg font-medium">{item.prompt}</p>

      {item.type === "mcq" ? (
        <fieldset className="space-y-2" disabled={locked}>
          <legend className="sr-only">{item.prompt}</legend>
          {item.options.map((o) => (
            <label
              key={o.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--radius-btn)] border border-line bg-surface px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-accent-soft"
            >
              <input
                type="radio"
                name={item.id}
                value={o.id}
                checked={choice === o.id}
                onChange={() => setChoice(o.id)}
                className="size-5 accent-[var(--color-primary)]"
              />
              <span>{o.text}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t("orderHint")}</p>
          <ol className="space-y-2">
            {order.map((id, i) => (
              <li key={id} className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-line bg-surface px-3 py-2">
                <span className="w-6 text-center font-bold text-primary" aria-label={t("position", { n: i + 1 })}>
                  {i + 1}
                </span>
                <span className="flex-1">{text(id)}</span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={locked || i === 0}
                  aria-label={t("moveUp")}
                  className="grid size-11 place-items-center rounded-full text-primary hover:bg-accent-soft disabled:opacity-30"
                >
                  <ArrowUp aria-hidden className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={locked || i === order.length - 1}
                  aria-label={t("moveDown")}
                  className="grid size-11 place-items-center rounded-full text-primary hover:bg-accent-soft disabled:opacity-30"
                >
                  <ArrowDown aria-hidden className="size-5" />
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result === null ? (
        <Button onClick={submit} disabled={item.type === "mcq" && choice === null} className="w-full">
          {t("submit")}
        </Button>
      ) : (
        <div role="status" className="space-y-3">
          {result ? (
            <p className="flex items-center gap-2 font-bold text-success">
              <CheckCircle2 aria-hidden className="size-5" />
              {t("correct")}
            </p>
          ) : (
            <div className="space-y-2 rounded-[var(--radius-card)] bg-accent-soft p-4">
              <p className="flex items-center gap-2 font-bold">
                <Info aria-hidden className="size-5 text-primary" />
                {t("tryAgain")}
              </p>
              {item.source_span ? <blockquote className="text-ink">{item.source_span}</blockquote> : null}
              {source ? (
                <p className="text-sm text-muted" dir="ltr">
                  {t("source")}: {source.url && source.url !== "TODO" ? (
                    <a className="text-primary underline" href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  ) : (
                    source.label
                  )}
                </p>
              ) : null}
            </div>
          )}
          <div className="flex gap-2">
            {!result ? (
              <Button variant="outline" onClick={retry} className="flex-1">
                {t("retry")}
              </Button>
            ) : null}
            {onContinue ? (
              <Button onClick={onContinue} className="flex-1">
                {t("next")}
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
