// F5 scope router. Classifies the QUESTION text (never the person) into answer | refer | abstain and a
// content level L1-L4. Deterministic rules (content/router_rules.json); no model call, so it is
// reproducible, free and cannot be talked out of its policy by the question itself.
// Default when unsure: refer.
import fs from "node:fs";
import path from "node:path";
import { normalize } from "./text";
import type { Level } from "./types";

export type RouteAction = "answer" | "refer" | "abstain";

export type RouteReason =
  | "crisis"
  | "invention-request"
  | "fatwa-request"
  | "personal-situation"
  | "sensitive-topic"
  | "disputed-topic"
  | "ruling-question"
  | "adversarial"
  | "citation-bypass"
  | "in-scope"
  | "unclear-form"
  | "no-reference";

export interface RouteDecision {
  action: RouteAction;
  level: Level;
  reason: RouteReason;
  conceptId: string | null;
  /** The question tried to override the rules (flagged, never obeyed). */
  adversarial: boolean;
  /** The question asked to skip sources: we still answer only with citations. */
  citationRequired: boolean;
  /** A person should be offered (refer and abstain). */
  handoff: boolean;
  /** Crisis wording: the handoff is flagged as urgent for a human. */
  urgent: boolean;
}

export interface RouterRules {
  crisis: string[];
  invention: string[];
  fatwa: string[];
  injection: string[];
  citation_bypass: string[];
  personal: string[];
  sensitive_topics: string[];
  disputed_topics: string[];
  ruling_markers: string[];
  informational: string[];
  concepts: Record<string, string[]>;
}

let cachedRules: RouterRules | null = null;
let cachedLevels: Map<string, { level: Level; order: number }> | null = null;

export function loadRules(): RouterRules {
  if (!cachedRules) {
    cachedRules = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "router_rules.json"), "utf8")) as RouterRules;
  }
  return cachedRules;
}

function conceptLevels() {
  if (!cachedLevels) {
    const cur = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "curriculum.json"), "utf8")) as {
      concepts: { id: string; level: Level; order: number }[];
    };
    cachedLevels = new Map(cur.concepts.map((c) => [c.id, { level: c.level, order: c.order }]));
  }
  return cachedLevels;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Common Arabic clitic prefixes (the, and, with, for, so, like) that may precede a pattern at a word start.
const AR_PREFIX = "(?:وال|بال|لل|فال|كال|ال|و|ب|ل|ف|ك)?";

/** Patterns match at a word start (loan -> loans; ال/و/ب prefixes allowed for Arabic), never mid-word. */
export function matches(text: string, pattern: string): boolean {
  const p = normalize(pattern);
  const prefix = /\p{Script=Arabic}/u.test(p) ? AR_PREFIX : "";
  return new RegExp(`(?<![\\p{L}\\p{N}])${prefix}${escapeRe(p)}`, "u").test(text);
}

const any = (text: string, patterns: string[]) => patterns.some((p) => matches(text, p));

export function matchConcept(text: string, rules: RouterRules): string | null {
  const levels = conceptLevels();
  let best: { id: string; hits: number; order: number } | null = null;
  for (const [id, kws] of Object.entries(rules.concepts)) {
    const hits = kws.filter((k) => matches(text, k)).length;
    if (hits === 0) continue;
    const order = levels.get(id)?.order ?? 99;
    if (!best || hits > best.hits || (hits === best.hits && order < best.order)) best = { id, hits, order };
  }
  return best?.id ?? null;
}

export function routeQuestion(question: string, rules: RouterRules = loadRules()): RouteDecision {
  const text = normalize(question);
  const conceptId = matchConcept(text, rules);
  const adversarial = any(text, rules.injection);
  const citationRequired = any(text, rules.citation_bypass);
  const base = { conceptId, adversarial, citationRequired };

  const abstain = (reason: RouteReason, urgent = false): RouteDecision => ({
    ...base, action: "abstain", level: "L4", reason, handoff: true, urgent,
  });
  const refer = (reason: RouteReason): RouteDecision => ({
    ...base, action: "refer", level: "L3", reason, handoff: true, urgent: false,
  });

  if (any(text, rules.crisis)) return abstain("crisis", true);
  if (any(text, rules.invention)) return abstain("invention-request");
  if (any(text, rules.fatwa)) return abstain("fatwa-request");
  if (any(text, rules.personal)) return abstain("personal-situation");
  if (any(text, rules.sensitive_topics)) return abstain("sensitive-topic");
  if (any(text, rules.disputed_topics)) return refer("disputed-topic");
  if (conceptId && any(text, rules.ruling_markers)) return refer("ruling-question");
  if (adversarial) return conceptId ? refer("adversarial") : abstain("adversarial");
  if (citationRequired && !conceptId) {
    return { ...base, action: "answer", level: "L1", reason: "citation-bypass", handoff: false, urgent: false };
  }
  if (conceptId && any(text, rules.informational)) {
    const level = conceptLevels().get(conceptId)?.level ?? "L1";
    return { ...base, action: "answer", level, reason: "in-scope", handoff: false, urgent: false };
  }
  if (conceptId) return refer("unclear-form"); // default = refer
  return abstain("no-reference");
}
