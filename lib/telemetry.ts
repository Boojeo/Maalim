"use client";

// Opt-in, anonymous counters (default OFF). Sends only { conceptId, kind }; the server adds the day.
import type { ProgressEventKind } from "./types";

const KEY = "maalim.share.v1";

export function shareEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setShareEnabled(on: boolean) {
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function track(conceptId: string, kind: ProgressEventKind) {
  if (!shareEnabled()) return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ conceptId, kind }),
    keepalive: true,
  }).catch(() => undefined);
}
