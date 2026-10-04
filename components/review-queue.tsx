"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { TokenGate } from "@/components/token-gate";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CheckResult } from "@/lib/item-check";
import type { Item, Passage } from "@/lib/types";

interface Row {
  item: Item;
  passage: Passage | null;
  check: CheckResult;
}
interface Payload {
  rows: Row[];
  counts: { draft: number; approved: number; rejected: number };
}

/** Reviewer queue: approve / reject draft items. Approval is refused server-side if the checks fail. */
export function ReviewQueue() {
  return <TokenGate endpoint="/api/admin/review" storageKey="maalim.admin">{(headers) => <ReviewBody headers={headers} />}</TokenGate>;
}

function ReviewBody({ headers }: { headers: Record<string, string> }) {
  const t = useTranslations("admin");
  const [reviewer, setReviewer] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/review", { headers })
      .then((r) => r.json() as Promise<Payload>)
      .then((j) => {
        if (!cancelled) setData(j);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  async function decide(id: string, decision: "approved" | "rejected") {
    if (reviewer.trim().length < 2) return setMessage(t("needName"));
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ id, decision, reviewer }),
    });
    if (res.ok) setMessage(t("saved"));
    else setMessage(((await res.json()) as { problems?: string[] }).problems?.join("; ") ?? "error");
    setVersion((v) => v + 1);
  }

  if (!data) return null;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t("counts", data.counts)}</p>
      <label className="block space-y-1">
        <span className="font-medium">{t("reviewer")}</span>
        <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} autoComplete="off" className="min-h-11 w-full rounded-[var(--radius-btn)] border border-line bg-surface px-3" />
      </label>
      {message ? <p role="status" className="font-medium text-primary">{message}</p> : null}
      {data.rows.length === 0 ? <p>{t("empty")}</p> : null}
      {data.rows.map(({ item, passage, check }) => (
        <Card key={item.id} className="space-y-3" data-testid="review-row">
          <p className="text-xs text-muted" dir="ltr">{item.id} · {item.type} · {item.lang}</p>
          <p className="font-medium" lang={item.lang} dir={item.lang === "ar" ? "rtl" : "ltr"}>{item.prompt}</p>
          <ul className="list-disc space-y-1 ps-5" lang={item.lang} dir={item.lang === "ar" ? "rtl" : "ltr"}>
            {item.options.map((o) => (
              <li key={o.id}>{o.id}. {o.text}</li>
            ))}
          </ul>
          <p className="text-sm"><strong>{t("answer")}:</strong> {Array.isArray(item.answer) ? item.answer.join(" → ") : item.answer || "—"}</p>
          <p className="text-sm"><strong>{t("span")}:</strong> <span lang={item.lang}>{item.source_span || "—"}</span></p>
          {passage ? <p className="text-sm text-muted"><strong>{t("source")}:</strong> {passage.source} {passage.source_id} · {passage.verified ? "verified" : "UNVERIFIED"}</p> : null}
          <div className={check.ok ? "text-success" : "text-error"}>
            <p className="flex items-center gap-2 font-bold">
              {check.ok ? <CheckCircle2 aria-hidden className="size-5" /> : <XCircle aria-hidden className="size-5" />}
              {check.ok ? t("passed") : t("failed")}
            </p>
            {!check.ok ? (
              <ul className="list-disc ps-5 text-sm text-ink">
                {check.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => decide(item.id, "approved")} disabled={!check.ok} className="flex-1">{t("approve")}</Button>
            <Button variant="outline" onClick={() => decide(item.id, "rejected")} className="flex-1">{t("reject")}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
