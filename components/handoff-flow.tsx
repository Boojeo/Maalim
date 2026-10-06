"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { findIdentifier } from "@/lib/identifiers";

export interface HandoffDraft {
  conceptId: string | null;
  conceptTitle: string | null;
  level: "L3" | "L4";
  reason: string;
  question: string;
  questionHash: string;
}

/** F7: the learner previews (and can edit) exactly what a mentor will see before anything is sent. */
export function HandoffFlow({ draft, onCancel }: { draft: HandoffDraft; onCancel: () => void }) {
  const t = useTranslations("handoff");
  const a = useTranslations("ask");
  const locale = useLocale();
  const [summary, setSummary] = useState(
    [
      `${t("topic")}: ${draft.conceptTitle ?? t("noTopic")}`,
      `${t("type")}: ${a(`reasons.${draft.reason}` as never)} (${draft.level})`,
      `${t("question")}: ${draft.question}`,
    ].join("\n"),
  );
  const [state, setState] = useState<"idle" | "sending" | "sent" | "identifier" | "failed">("idle");
  const [code, setCode] = useState("");

  async function send() {
    if (findIdentifier(summary)) return setState("identifier"); // also enforced by the server
    setState("sending");
    try {
      const res = await fetch("/api/handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conceptId: draft.conceptId, level: draft.level, questionHash: draft.questionHash, summary }),
      });
      if (res.status === 422) return setState("identifier");
      if (!res.ok) return setState("failed");
      setCode(((await res.json()) as { code: string }).code);
      setState("sent");
    } catch {
      setState("failed");
    }
  }

  if (state === "sent") {
    return (
      <Card className="space-y-2" role="status">
        <p className="flex items-center gap-2 text-lg font-bold text-success">
          <CheckCircle2 aria-hidden className="size-5" />
          {t("sentTitle")}
        </p>
        <p>{t("sentBody", { code })}</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p>{t("intro")}</p>
      <label className="block space-y-1">
        <span className="font-medium">{t("summary")}</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={6}
          maxLength={800}
          dir={locale === "ar" ? "rtl" : "ltr"}
          className="w-full rounded-[var(--radius-btn)] border-[3px] border-outline bg-surface p-3"
        />
      </label>
      <p className="text-sm text-muted">{t("privacy")}</p>
      {state === "identifier" ? <p role="alert" className="font-medium text-error">{t("identifier")}</p> : null}
      {state === "failed" ? <p role="alert" className="font-medium text-error">{t("failed")}</p> : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">{t("cancel")}</Button>
        <Button onClick={send} disabled={state === "sending" || summary.trim().length < 10} className="flex-1">
          {state === "sending" ? t("sending") : t("send")}
        </Button>
      </div>
    </Card>
  );
}
