"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { GuardedSentence } from "@/lib/citation-guard";
import type { Passage } from "@/lib/types";

interface Row {
  entry: { concept_id: string; level: "L1" | "L2" | "L3" | "L4"; lang: "ar" | "en"; query_hash: string; status: string; reviewed_by: string | null };
  sentences: GuardedSentence[];
  passages: Passage[];
}

/** Reviewer decisions on generated explanations: rejected ones fall back to the verbatim source. */
export function ExplanationReview({ headers, reviewer, onMessage }: { headers: Record<string, string>; reviewer: string; onMessage: (m: string) => void }) {
  const t = useTranslations("admin");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/explanations", { headers })
      .then((r) => r.json() as Promise<{ rows: Row[] }>)
      .then((j) => {
        if (!cancelled) setRows(j.rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function decide(r: Row, decision: "approved" | "rejected") {
    if (reviewer.trim().length < 2) return onMessage(t("needName"));
    const { concept_id, level, lang, query_hash } = r.entry;
    const res = await fetch("/api/admin/explanations", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ concept_id, level, lang, query_hash, decision, reviewer }),
    });
    onMessage(res.ok ? t("saved") : "error");
    setVersion((v) => v + 1);
  }

  if (!rows) return null;
  return (
    <section aria-labelledby="expl-h" className="space-y-3">
      <h2 id="expl-h" className="text-xl font-bold">{t("explanations")}</h2>
      <p className="text-sm text-muted">{t("explanationsHint")}</p>
      {rows.length === 0 ? <p>{t("noExplanations")}</p> : null}
      {rows.map((r) => (
        <Card key={`${r.entry.concept_id}${r.entry.lang}${r.entry.query_hash}`} className="space-y-3" data-testid="explanation-row">
          <p className="text-xs text-muted" dir="ltr">{r.entry.concept_id} · {r.entry.level} · {r.entry.lang} · {r.entry.status}{r.entry.reviewed_by ? ` · ${r.entry.reviewed_by}` : ""}</p>
          <ol className="space-y-2" lang={r.entry.lang} dir={r.entry.lang === "ar" ? "rtl" : "ltr"}>
            {r.sentences.map((s, i) => (
              <li key={i}>
                {s.text} <span className="text-sm text-muted" dir="ltr">[{s.passageIds.join(", ")}]</span>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <Button onClick={() => decide(r, "approved")} disabled={r.entry.status === "approved"} className="flex-1">{t("approve")}</Button>
            <Button variant="outline" onClick={() => decide(r, "rejected")} disabled={r.entry.status === "rejected"} className="flex-1">{t("reject")}</Button>
          </div>
        </Card>
      ))}
    </section>
  );
}
