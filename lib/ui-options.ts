// Three design directions for the owner to choose from (UI_BRIEF.md: /dev/ui-options). Static mockups only:
// the app keeps the brief's default until a choice is recorded in STATUS.md.
export interface UiOption {
  id: "A" | "B" | "C";
  name: string;
  tagline: string;
  pros: string[];
  cons: string[];
  t: {
    bg: string; surface: string; ink: string; muted: string; line: string;
    primary: string; primaryFg: string; accent: string; accentSoft: string;
    radiusCard: number; radiusBtn: number; borderW: number; shadow: string; btnShadow: string;
    titleWeight: number; titleSize: number; pad: number;
  };
}

export const UI_OPTIONS: UiOption[] = [
  {
    id: "A",
    name: "Calm and warm",
    tagline: "The brief's default: warm off-white, deep teal, soft gold, generous space.",
    pros: ["Matches the brief: calm, no pressure", "Large, soft cards suit an anxious first-time learner", "Gold is decoration only, so contrast stays safe"],
    cons: ["Least distinctive on a judging table", "Soft shadows can feel quiet on a projector"],
    t: { bg: "#FAF7F2", surface: "#FFFFFF", ink: "#1F2933", muted: "#52606D", line: "#E4DDD0", primary: "#0F5E5A", primaryFg: "#FFFFFF", accent: "#C9A24B", accentSoft: "#F3E9D0", radiusCard: 16, radiusBtn: 12, borderW: 1, shadow: "0 1px 3px rgba(31,41,51,.08)", btnShadow: "none", titleWeight: 700, titleSize: 24, pad: 20 },
  },
  {
    id: "B",
    name: "Clean and modern",
    tagline: "Cool light grey, crisp blue, flat 1px lines, tighter and more compact.",
    pros: ["Looks like a modern product; reads well on a projector", "Compact: more steps visible without scrolling", "Neutral, easy to localise later"],
    cons: ["Cooler and less warm than the brief asks for", "Flat design gives less visual encouragement"],
    t: { bg: "#F4F6FA", surface: "#FFFFFF", ink: "#0F172A", muted: "#475569", line: "#D5DCE6", primary: "#1D4ED8", primaryFg: "#FFFFFF", accent: "#0891B2", accentSoft: "#E0F2FE", radiusCard: 8, radiusBtn: 8, borderW: 1, shadow: "none", btnShadow: "none", titleWeight: 700, titleSize: 22, pad: 16 },
  },
  {
    id: "C",
    name: "Bold and playful",
    tagline: "Thick outlines, chunky buttons, violet and amber, big friendly type.",
    pros: ["Memorable and energetic; very easy to tap", "Strong visual progress feedback", "Stands out in a demo"],
    cons: ["Conflicts with the brief: 'no gamified noise, no pressure'", "Louder; may feel childish for some adults", "More work to keep every state accessible"],
    t: { bg: "#FFF7ED", surface: "#FFFFFF", ink: "#1E1B4B", muted: "#4B4A6B", line: "#1E1B4B", primary: "#6D28D9", primaryFg: "#FFFFFF", accent: "#F59E0B", accentSoft: "#FDE68A", radiusCard: 24, radiusBtn: 16, borderW: 3, shadow: "4px 4px 0 #1E1B4B", btnShadow: "3px 3px 0 #1E1B4B", titleWeight: 800, titleSize: 28, pad: 20 },
  },
];

/** Text/background pairs used by the mockups; each must reach WCAG AA (4.5:1). Accent is decorative only. */
export function contrastPairs(o: UiOption): [string, string, string][] {
  const t = o.t;
  return [
    ["ink on bg", t.ink, t.bg],
    ["ink on surface", t.ink, t.surface],
    ["muted on bg", t.muted, t.bg],
    ["muted on surface", t.muted, t.surface],
    ["primary on bg", t.primary, t.bg],
    ["primary on surface", t.primary, t.surface],
    ["primary-fg on primary", t.primaryFg, t.primary],
    ["ink on accent-soft", t.ink, t.accentSoft],
    ["primary on accent-soft", t.primary, t.accentSoft],
    ["ink on accent", t.ink, t.accent],
  ];
}
