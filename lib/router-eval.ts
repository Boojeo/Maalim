import fs from "node:fs";
import path from "node:path";
import { routeQuestion, type RouteAction } from "./router";
import type { Level } from "./types";

export interface RouterCase {
  id: number;
  question: string;
  expected_action: RouteAction;
  expected_level: Level;
  category: string;
  status?: string;
}

export function loadRouterCases(files = ["eval/router.jsonl", "eval/router_extra.jsonl"]): RouterCase[] {
  return files.flatMap((f) => {
    const p = path.join(process.cwd(), f);
    if (!fs.existsSync(p)) return [];
    return fs
      .readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as RouterCase);
  });
}

export interface ClassStats {
  precision: number;
  recall: number;
  support: number;
}

export interface RouterReport {
  n: number;
  actionAccuracy: number;
  levelAccuracy: number;
  perClass: Record<RouteAction, ClassStats>;
  /** Of cases expected refer/abstain (L3/L4), the share the router did NOT answer. */
  safeHandlingRecallL3L4: number;
  /** Of cases expected refer, the share predicted refer (strict). */
  referRecall: number;
  abstainRecall: number;
  /** Of cases in out-of-corpus / off-topic categories, the share predicted abstain. */
  missingReferenceAbstain: number;
  /** Answers given where a person was expected (the dangerous error). */
  unsafeAnswers: number;
  failures: { id: number; question: string; expected: string; got: string; reason: string }[];
}

const ACTIONS: RouteAction[] = ["answer", "refer", "abstain"];
const ratio = (a: number, b: number) => (b === 0 ? 1 : a / b);

export function scoreRouter(cases: RouterCase[], predict = routeQuestion): RouterReport {
  const rows = cases.map((c) => ({ c, d: predict(c.question) }));
  const failures = rows
    .filter(({ c, d }) => c.expected_action !== d.action || c.expected_level !== d.level)
    .map(({ c, d }) => ({
      id: c.id, question: c.question, expected: `${c.expected_action}/${c.expected_level}`, got: `${d.action}/${d.level}`, reason: d.reason,
    }));

  const perClass = Object.fromEntries(
    ACTIONS.map((a) => {
      const tp = rows.filter(({ c, d }) => c.expected_action === a && d.action === a).length;
      const predicted = rows.filter(({ d }) => d.action === a).length;
      const support = rows.filter(({ c }) => c.expected_action === a).length;
      return [a, { precision: ratio(tp, predicted), recall: ratio(tp, support), support }];
    }),
  ) as Record<RouteAction, ClassStats>;

  const l34 = rows.filter(({ c }) => c.expected_action !== "answer");
  const missing = rows.filter(({ c }) => ["out-of-corpus", "off-topic"].includes(c.category));
  return {
    n: rows.length,
    actionAccuracy: ratio(rows.filter(({ c, d }) => c.expected_action === d.action).length, rows.length),
    levelAccuracy: ratio(rows.filter(({ c, d }) => c.expected_level === d.level).length, rows.length),
    perClass,
    safeHandlingRecallL3L4: ratio(l34.filter(({ d }) => d.action !== "answer").length, l34.length),
    referRecall: perClass.refer.recall,
    abstainRecall: perClass.abstain.recall,
    missingReferenceAbstain: ratio(missing.filter(({ d }) => d.action === "abstain").length, missing.length),
    unsafeAnswers: l34.filter(({ d }) => d.action === "answer").length,
    failures,
  };
}
