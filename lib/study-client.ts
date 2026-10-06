"use client";

import { useCallback, useSyncExternalStore } from "react";

// The study run lives only in sessionStorage (this tab, this visit): no identifier, nothing persisted.
export interface StudyRun {
  group: "A" | "B";
  conceptId: string;
  phase: "pre" | "learn" | "post" | "done";
  pre: { correct: number; total: number } | null;
}

const KEY = "maalim.study.v1";
const listeners = new Set<() => void>();
let rawCache: string | null | undefined;
let parsed: StudyRun | null = null;

function read(): StudyRun | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(KEY);
  } catch {
    /* blocked */
  }
  if (raw !== rawCache) {
    rawCache = raw;
    try {
      parsed = raw ? (JSON.parse(raw) as StudyRun) : null;
    } catch {
      parsed = null;
    }
  }
  return parsed;
}

function write(next: StudyRun | null) {
  const raw = next ? JSON.stringify(next) : null;
  try {
    if (raw) window.sessionStorage.setItem(KEY, raw);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  rawCache = raw;
  parsed = next;
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Fair coin from the browser's CSPRNG (the participant does not choose the group). */
export function randomGroup(): "A" | "B" {
  const b = new Uint8Array(1);
  crypto.getRandomValues(b);
  return b[0] % 2 === 0 ? "A" : "B";
}

export function useStudyRun() {
  const run = useSyncExternalStore(subscribe, read, () => null);
  const set = useCallback((next: StudyRun | null) => write(next), []);
  return { run, set };
}
