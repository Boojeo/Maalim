"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { SOURCE_LABEL } from "@/components/citation-chip";
import type { Passage } from "@/lib/types";

export interface CitedItem {
  text: string;
  ids: string[];
}

/**
 * Text with citation chips. Tapping a chip opens ONE shared source panel under the text (so the sentence
 * never gets pushed apart), showing the verbatim passage and its source. Used by explanations and the ask flow.
 */
export function CitedText({
  items,
  passages,
  showPassageText = true,
  lang,
}: {
  items: CitedItem[];
  passages: Passage[];
  /** false when the text itself already is the passage (verbatim mode): the panel then shows only the source. */
  showPassageText?: boolean;
  lang: "ar" | "en";
}) {
  const t = useTranslations("sources");
  const panelId = useId();
  const [open, setOpen] = useState<string | null>(null);
  const byId = new Map(passages.map((p) => [p.id, p]));
  const order = [...new Set(items.flatMap((i) => i.ids))];
  const active = open ? byId.get(open) : null;
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-3" lang={lang} dir={dir}>
      <div className="leading-loose">
        {items.map((it, i) => (
          <span key={i}>
            {it.text}{" "}
            {it.ids.map((id) => {
              const p = byId.get(id);
              if (!p) return null;
              const n = order.indexOf(id) + 1;
              const isOpen = open === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={`${t("title")} ${n}: ${SOURCE_LABEL[p.source]} ${p.source_id}`}
                  onClick={() => setOpen(isOpen ? null : id)}
                  className={`mx-0.5 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium ${isOpen ? "border-primary bg-primary text-primary-fg" : "border-primary bg-surface text-primary hover:bg-accent-soft"}`}
                >
                  [{n}]
                </button>
              );
            })}{" "}
          </span>
        ))}
      </div>
      <div id={panelId} role="region" aria-live="polite">
        {active ? (
          <div className="space-y-2 rounded-[var(--radius-btn)] border border-line bg-surface p-3">
            {showPassageText ? (
              <>
                <p className="text-sm font-bold text-muted">{t("verbatim")}</p>
                <blockquote lang={active.lang} dir={active.lang === "ar" ? "rtl" : "ltr"} className="text-ink">
                  {active.text}
                </blockquote>
              </>
            ) : null}
            <p className="text-sm text-muted" dir="ltr">
              {t("from", { source: SOURCE_LABEL[active.source], id: active.source_id })}
            </p>
            {active.source_url && active.source_url !== "TODO" ? (
              <a href={active.source_url} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline" rel="noreferrer" target="_blank">
                {t("open")}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
