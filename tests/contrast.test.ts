import { describe, expect, it } from "vitest";
import { tokens } from "@/lib/tokens";

function lum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Text/background pairs actually used in the UI. Accent gold is decorative only (never text).
const pairs: [string, string, string][] = [
  ["ink", tokens.ink, tokens.bg],
  ["ink on surface", tokens.ink, tokens.surface],
  ["muted on bg", tokens.muted, tokens.bg],
  ["muted on surface", tokens.muted, tokens.surface],
  ["primary on bg", tokens.primary, tokens.bg],
  ["primary on surface", tokens.primary, tokens.surface],
  ["primary-fg on primary", tokens.primaryFg, tokens.primary],
  ["primary-fg on primary-hover", tokens.primaryFg, tokens.primaryHover],
  ["ink on accent-soft", tokens.ink, tokens.accentSoft],
  ["primary on accent-soft", tokens.primary, tokens.accentSoft],
  ["white on success", "#FFFFFF", tokens.success],
  ["error on surface", tokens.error, tokens.surface],
  ["white on danger banner", "#FFFFFF", tokens.dangerBg],
  ["ink on accent", tokens.ink, tokens.accent],
];

describe("design tokens contrast (WCAG AA >= 4.5)", () => {
  it.each(pairs)("%s", (_n, fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
