"use client";

import { useCallback, useSyncExternalStore } from "react";
import { emptyProgress, parseProgress, type ProgressState } from "./progress";

const KEY = "maalim.progress.v1";
const listeners = new Set<() => void>();
let snapshotRaw: string | null | undefined;
let snapshot: ProgressState = emptyProgress();
const SERVER: ProgressState = emptyProgress();

function read(): ProgressState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage blocked: stay in-memory */
  }
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parseProgress(raw);
  }
  return snapshot;
}

function write(next: ProgressState) {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* ignore */
  }
  snapshotRaw = raw;
  snapshot = next;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Progress lives only in this browser's localStorage. */
export function useProgress() {
  const state = useSyncExternalStore(subscribe, read, () => SERVER);
  const update = useCallback((fn: (s: ProgressState) => ProgressState) => write(fn(read())), []);
  const reset = useCallback(() => write(emptyProgress()), []);
  return { state, update, reset };
}
