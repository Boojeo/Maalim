"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BarList } from "@/components/bar-list";
import { TokenGate } from "@/components/token-gate";
import type { Aggregates } from "@/lib/aggregates";
import type { StudySummary } from "@/lib/study";
import type { Level, ReferralStatus } from "@/lib/types";

interface Payload {
  referrals: { id: string; concept_id: string | null; level: Level; consented_summary: string; created_at: string; status: ReferralStatus }[];
  aggregates: Aggregates;
  study: StudySummary;
  concepts: { id: string; title_ar: string; title_en: string }[];
}

export function MentorDashboard() {
  return <TokenGate endpoint="/api/mentor" storageKey="maalim.mentor">{(headers) => <Body headers={headers} />}</TokenGate>;
}

function Body({ headers }: { headers: Record<string, string> }) {
  const t = useTranslations("mentor");
  const locale = useLocale();
  const [data, setData] = useState<Payload | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/mentor", { headers })
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

  async function setStatus(id: string, status: ReferralStatus) {
    await fetch("/api/mentor", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ id, status }) });
    setVersion((v) => v + 1);
  }

  if (!data) return null;
  const title = (id: string | null) => {
    const c = data.concepts.find((x) => x.id === id);
    return c ? (locale === "ar" ? c.title_ar : c.title_en) : t("none");
  };
  const cell = (n: number | null) => (n === null ? t("hidden") : n);
  const a = data.aggregates;
  const th = "py-2 pe-3 text-start font-bold";
  const pctOrHidden = (x: number | null) => (x === null ? t("hidden") : `${Math.round(x * 100)}%`);

  return (
    <div className="space-y-8">
      <section aria-labelledby="inbox-h" className="space-y-3">
        <h2 id="inbox-h" className="text-xl font-bold">{t("inbox")}</h2>
        {data.referrals.length === 0 ? (
          <p>{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("inbox")}>
            <table className="w-full min-w-[40rem] border-collapse text-sm" data-testid="referral-table">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className={th}>{t("date")}</th>
                  <th scope="col" className={th}>{t("topic")}</th>
                  <th scope="col" className={th}>{t("level")}</th>
                  <th scope="col" className={th}>{t("summary")}</th>
                  <th scope="col" className={th}>{t("status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((r) => (
                  <tr key={r.id} className="border-b border-line align-top">
                    <td className="py-2 pe-3">{r.created_at.slice(0, 10)}</td>
                    <td className="py-2 pe-3">{title(r.concept_id)}</td>
                    <td className="py-2 pe-3">{r.level}</td>
                    <td className="whitespace-pre-line py-2 pe-3">{r.consented_summary}</td>
                    <td className="py-2">
                      <select
                        aria-label={`${t("status")}: ${r.id.slice(0, 8)}`}
                        value={r.status}
                        onChange={(e) => setStatus(r.id, e.target.value as ReferralStatus)}
                        className="min-h-11 rounded-[var(--radius-btn)] border-[3px] border-outline bg-surface px-2"
                      >
                        <option value="new">{t("statusNew")}</option>
                        <option value="seen">{t("statusSeen")}</option>
                        <option value="closed">{t("statusClosed")}</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="agg-h" className="space-y-4">
        <h2 id="agg-h" className="text-xl font-bold">{t("aggregates")}</h2>
        <p className="text-sm text-muted">{t("total", { n: a.referrals.total })} · {t("suppressed")}</p>
        <div className="grid gap-6 md:grid-cols-2" data-testid="charts">
          <BarList title={t("byLevel")} hiddenLabel={t("hidden")} bars={(Object.entries(a.referrals.byLevel) as [string, number | null][]).map(([label, value]) => ({ label, value }))} />
          <BarList title={t("unitsDone")} hiddenLabel={t("hidden")} bars={a.progress.map((p) => ({ label: title(p.concept), value: p.unitsDone }))} />
        </div>
        <p className="text-sm text-muted">{t("tableView")}</p>
        <div className="grid gap-6 md:grid-cols-2">
          <table className="border-collapse text-sm" data-testid="agg-level">
            <caption className="pb-2 text-start font-bold">{t("byLevel")}</caption>
            <tbody>
              {(Object.entries(a.referrals.byLevel) as [string, number | null][]).map(([k, v]) => (
                <tr key={k} className="border-b border-line"><th scope="row" className={th}>{k}</th><td>{cell(v)}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="border-collapse text-sm">
            <caption className="pb-2 text-start font-bold">{t("byConcept")}</caption>
            <tbody>
              {(Object.entries(a.referrals.byConcept) as [string, number | null][]).map(([k, v]) => (
                <tr key={k} className="border-b border-line"><th scope="row" className={th}>{title(k === "none" ? null : k)}</th><td>{cell(v)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("progress")}>
          <table className="w-full min-w-[28rem] border-collapse text-sm" data-testid="agg-progress">
            <caption className="pb-2 text-start font-bold">{t("progress")}</caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className={th}>{t("topic")}</th>
                <th scope="col" className={th}>{t("unitsDone")}</th>
                <th scope="col" className={th}>{t("answers")}</th>
                <th scope="col" className={th}>{t("accuracy")}</th>
              </tr>
            </thead>
            <tbody>
              {a.progress.map((p) => (
                <tr key={p.concept} className="border-b border-line">
                  <th scope="row" className={th}>{title(p.concept)}</th>
                  <td>{cell(p.unitsDone)}</td>
                  <td>{cell(p.checkAnswers)}</td>
                  <td>{p.accuracy === null ? t("hidden") : `${Math.round(p.accuracy * 100)}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="study-h" className="space-y-3">
        <h2 id="study-h" className="text-xl font-bold">{t("study")}</h2>
        <p className="text-sm text-muted">{t("studyIntro")}</p>
        <table className="w-full max-w-xl border-collapse text-sm" data-testid="study-table">
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className={th}>{t("studyGroup")}</th>
              <th scope="col" className={th}>{t("studyN")}</th>
              <th scope="col" className={th}>{t("studyPre")}</th>
              <th scope="col" className={th}>{t("studyPost")}</th>
              <th scope="col" className={th}>{t("studyGain")}</th>
            </tr>
          </thead>
          <tbody>
            {data.study.groups.map((g) => (
              <tr key={g.group} className="border-b border-line">
                <th scope="row" className={th}>{g.group === "A" ? t("studyA") : t("studyB")}</th>
                <td>{cell(g.n)}</td>
                <td>{g.n === 0 ? "–" : pctOrHidden(g.meanPre)}</td>
                <td>{g.n === 0 ? "–" : pctOrHidden(g.meanPost)}</td>
                <td>{g.n === 0 ? "–" : g.gain === null ? t("hidden") : `${g.gain >= 0 ? "+" : ""}${Math.round(g.gain * 100)} ${t("points")}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-medium">
          {data.study.difference === null ? t("studyNoDiff") : `${t("studyDiff")}: ${data.study.difference >= 0 ? "+" : ""}${Math.round(data.study.difference * 100)} ${t("points")}`}
        </p>
        <div className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">
          <p className="font-bold">{t("studyLimits")}</p>
          <ul className="list-disc ps-5">
            <li>{t("limit1")}</li>
            <li>{t("limit2")}</li>
            <li>{t("limit3")}</li>
            <li>{t("limit4")}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
