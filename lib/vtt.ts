// Minimal WebVTT helpers: slice a full-timeline caption file into the window of one clip and shift it to 0.
// Mechanical only: caption TEXT is never changed (religious text must come from, and be checked by, people).

const TIME = /((?:\d+:)?\d{1,2}:\d{2})[.,](\d{3})/;

/** "1:09", "0:25", "00:01:09.500" -> seconds. */
export function parseTime(s: string): number {
  const m = s.trim().match(/^(?:(\d+):)?(\d+):(\d+)(?:[.,](\d+))?$/);
  if (!m) throw new Error(`bad time: ${s}`);
  const [, h, mi, se, ms] = m;
  return Number(h ?? 0) * 3600 + Number(mi) * 60 + Number(se) + (ms ? Number(`0.${ms}`) : 0);
}

export function formatTime(sec: number): string {
  const t = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(t / 3_600_000);
  const m = Math.floor((t % 3_600_000) / 60_000);
  const s = Math.floor((t % 60_000) / 1000);
  const ms = t % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)}.${p(ms, 3)}`;
}

export interface Cue {
  start: number;
  end: number;
  text: string;
}

export function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r/g, "").split(/\n{2,}/)) {
    const lines = block.split("\n");
    const i = lines.findIndex((l) => l.includes("-->"));
    if (i < 0) continue;
    const [a, rest] = lines[i].split("-->");
    const b = rest.trim().split(/\s+/)[0];
    if (!TIME.test(a) && !/^\s*\d+:\d{2}/.test(a)) continue;
    const text = lines
      .slice(i + 1)
      .join("\n")
      .replace(/<[^>]*>/g, "") // inline timing / styling tags
      .trim();
    if (!text) continue;
    cues.push({ start: parseTime(a), end: parseTime(b), text });
  }
  return cues;
}

/** Cues overlapping [start, end], clipped to the window and shifted so the window starts at 0. */
export function sliceVtt(vtt: string, start: number, end: number): string {
  const out = ["WEBVTT", ""];
  for (const c of parseVtt(vtt)) {
    if (c.end <= start || c.start >= end) continue;
    const s = Math.max(c.start, start) - start;
    const e = Math.min(c.end, end) - start;
    if (e - s < 0.05) continue;
    out.push(`${formatTime(s)} --> ${formatTime(e)}`, c.text, "");
  }
  return out.join("\n");
}

export function hasCues(vtt: string): boolean {
  return parseVtt(vtt).length > 0;
}
