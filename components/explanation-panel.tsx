"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CitedText } from "@/components/cited-text";
import { ContentPending } from "@/components/content-pending";
import type { ExplainResult } from "@/lib/explain";
import type { Lang, Passage } from "@/lib/types";

type Settled = { key: string; result: ExplainResult | null }; // result null = request failed

/**
 * F3 UI. Calls /api/explain (retrieve -> generate -> citation guard). Every sentence is followed by
 * citation chips that open the verbatim source. If the call fails, the verified passages that the
 * server already rendered are shown verbatim instead.
 */
export function ExplanationPanel({
  conceptId,
  lang,
  fallbackPassages,
  query,
  fallbackToConcept,
  showDev,
}: {
  conceptId: string;
  lang: Lang;
  fallbackPassages: Passage[];
  query?: string;
  fallbackToConcept?: boolean;
  showDev: boolean;
}) {
  const t = useTranslations("explain");
  const [settled, setSettled] = useState<Settled | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${conceptId}|${lang}|${query ?? ""}|${attempt}`;

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptId, lang, query, fallbackToConcept }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<ExplainResult>) : Promise.reject(new Error(String(r.status)))))
      .then((result) => setSettled({ key, result }))
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setSettled({ key, result: null });
      });
    return () => ctrl.abort();
  }, [conceptId, lang, query, fallbackToConcept, key]);

  if (!settled || settled.key !== key) {
    return (
      <p role="status" className="text-muted">
        {t("loading")}
      </p>
    );
  }

  const verbatim = (passages: Passage[]) =>
    passages.length === 0 ? (
      <ContentPending showRaw={showDev} raw="[CONTENT NEEDED: verified passages for this concept]" />
    ) : (
      <div className="space-y-3">
        <p className="text-sm font-bold text-muted">{t("verbatimNote")}</p>
        {passages.map((p) => (
          <CitedText key={p.id} lang={p.lang} items={[{ text: p.text, ids: [p.id] }]} passages={[p]} showPassageText={false} />
        ))}
      </div>
    );

  if (settled.result === null) {
    return (
      <div className="space-y-3">
        {verbatim(fallbackPassages)}
        <button type="button" onClick={() => setAttempt((a) => a + 1)} className="min-h-11 text-primary underline">
          {t("retry")}
        </button>
      </div>
    );
  }

  const r = settled.result;
  if (r.mode === "none") return <ContentPending showRaw={showDev} raw="[CONTENT NEEDED: verified passages for this concept]" />;
  if (r.mode === "verbatim") return verbatim(r.passages);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-muted" lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
        {t("generatedNote")}
      </p>
      <CitedText lang={r.lang} items={r.sentences.map((s) => ({ text: s.text, ids: s.passageIds }))} passages={r.passages} />
    </div>
  );
}
