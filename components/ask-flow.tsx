"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContentPending } from "@/components/content-pending";
import { ExplanationPanel } from "@/components/explanation-panel";
import { HandoffFlow, type HandoffDraft } from "@/components/handoff-flow";
import type { Lang } from "@/lib/types";

interface RouteResponse {
  action: "answer" | "refer" | "abstain";
  level: "L1" | "L2" | "L3" | "L4";
  reason: string;
  conceptId: string | null;
  urgent: boolean;
  handoff: boolean;
  answerable: boolean | null;
  referralText: string | null;
  questionHash: string;
}

/** F5 + F7 on one screen: route the question, answer with citations, or hand off to a person. */
export function AskFlow({ concepts, showDev, initialQuestion = "" }: { concepts: { id: string; title: string }[]; showDev: boolean; initialQuestion?: string }) {
  const t = useTranslations("ask");
  const locale = useLocale() as Lang;
  const [question, setQuestion] = useState(initialQuestion);
  const [asked, setAsked] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [handoff, setHandoff] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    setStatus("loading");
    setHandoff(false);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, lang: locale }),
      });
      if (!res.ok) return setStatus("error");
      setRoute((await res.json()) as RouteResponse);
      setAsked(q);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  const title = route?.conceptId ? concepts.find((c) => c.id === route.conceptId)?.title ?? null : null;
  const draft: HandoffDraft | null =
    route && route.handoff
      ? { conceptId: route.conceptId, conceptTitle: title, level: route.level === "L3" ? "L3" : "L4", reason: route.reason, question: asked, questionHash: route.questionHash }
      : null;
  const offerHandoff = () => {
    if (!route) return;
    setRoute({ ...route, handoff: true, level: route.level === "L3" ? "L3" : "L4" });
    setHandoff(true);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1">
          <span className="font-medium">{t("label")}</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={t("placeholder")}
            className="w-full rounded-[var(--radius-btn)] border border-line bg-surface p-3"
          />
        </label>
        <Button type="submit" disabled={status === "loading" || !question.trim()} className="w-full">
          {status === "loading" ? t("asking") : t("submit")}
        </Button>
        <p className="text-sm text-muted">{t("noRulings")}</p>
      </form>

      {status === "error" ? <p role="alert" className="font-medium text-error">{t("error")}</p> : null}

      {status === "done" && route ? (
        <div className="space-y-3" aria-live="polite">
          {route.action === "answer" ? (
            <Card className="space-y-3">
              {title ? <h2 className="text-lg font-bold">{t("about", { topic: title })}</h2> : null}
              {route.answerable && route.conceptId ? (
                <ExplanationPanel conceptId={route.conceptId} lang={locale} query={asked} fallbackToConcept fallbackPassages={[]} showDev={showDev} />
              ) : (
                <>
                  <ContentPending showRaw={showDev} raw="[CONTENT NEEDED: verified passages for this concept]" />
                  <p>{t("notReady")}</p>
                </>
              )}
              <p className="text-sm text-muted">{t("citationNote")}</p>
              {!handoff ? (
                <p className="text-sm">
                  {t("stillNeed")}{" "}
                  <button type="button" onClick={offerHandoff} className="min-h-11 text-primary underline">{t("talk")}</button>
                </p>
              ) : null}
            </Card>
          ) : (
            <Card className={`space-y-3 ${route.urgent ? "border-2 border-primary" : ""}`} role={route.urgent ? "alert" : undefined}>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                {route.urgent ? <LifeBuoy aria-hidden className="size-5 text-primary" /> : null}
                {route.urgent ? t("urgentTitle") : t("referTitle")}
              </h2>
              <p>{route.referralText ?? (route.urgent ? t("urgentDefault") : t("referDefault"))}</p>
              {!handoff ? <Button onClick={() => setHandoff(true)} className="w-full">{t("talk")}</Button> : null}
            </Card>
          )}
          {handoff && draft ? <HandoffFlow draft={draft} onCancel={() => setHandoff(false)} /> : null}
        </div>
      ) : null}
    </div>
  );
}
