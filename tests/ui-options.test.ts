import { describe, expect, it } from "vitest";
import { UI_OPTIONS, contrastPairs } from "@/lib/ui-options";

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe("design options: every text pair reaches WCAG AA (>= 4.5:1)", () => {
  for (const o of UI_OPTIONS) {
    it.each(contrastPairs(o))(`${o.id} ${o.name}: %s`, (_n, fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
  it("offers exactly three distinct options", () => {
    expect(UI_OPTIONS.map((o) => o.id)).toEqual(["A", "B", "C"]);
    expect(new Set(UI_OPTIONS.map((o) => o.t.primary)).size).toBe(3);
  });
});
