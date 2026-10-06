import { describe, expect, it } from "vitest";
import { formatTime, hasCues, parseTime, parseVtt, sliceVtt } from "@/lib/vtt";

const full = `WEBVTT

00:00:05.000 --> 00:00:09.000
before the window

00:00:24.000 --> 00:00:27.500 align:start position:0%
first <c>cue</c> straddles the start

00:00:30.000 --> 00:00:33.000
inside the window

00:00:34.000 --> 00:00:40.000
straddles the end

00:00:50.000 --> 00:00:52.000
after the window
`;

describe("vtt helpers", () => {
  it("parses step times and formats cue times", () => {
    expect(parseTime("1:09")).toBe(69);
    expect(parseTime("0:25")).toBe(25);
    expect(parseTime("00:01:09.500")).toBe(69.5);
    expect(formatTime(69.5)).toBe("00:01:09.500");
    expect(() => parseTime("abc")).toThrow();
  });
  it("parses cues, ignoring cue settings and inline tags", () => {
    const cues = parseVtt(full);
    expect(cues).toHaveLength(5);
    expect(cues[1]).toEqual({ start: 24, end: 27.5, text: "first cue straddles the start" });
  });
  it("slices a window, clips straddling cues and shifts to 0 without touching the text", () => {
    const out = sliceVtt(full, 25, 35);
    expect(out.startsWith("WEBVTT")).toBe(true);
    expect(out).toContain("00:00:00.000 --> 00:00:02.500\nfirst cue straddles the start");
    expect(out).toContain("00:00:05.000 --> 00:00:08.000\ninside the window");
    expect(out).toContain("00:00:09.000 --> 00:00:10.000\nstraddles the end");
    expect(out).not.toContain("before the window");
    expect(out).not.toContain("after the window");
  });
  it("reports an empty slice", () => {
    expect(hasCues(sliceVtt(full, 100, 110))).toBe(false);
  });
});
