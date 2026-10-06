import { afterEach, describe, expect, it } from "vitest";
import { applyAvailability, futureConceptIds } from "@/lib/availability";
import { buildDemoItems, demoEnabled, usedSteps } from "@/lib/demo";
import { gradeItem } from "@/lib/practice";
import { emptyProgress, recommend } from "@/lib/progress";
import { createLocalStore } from "@/lib/data/local";

const OLD = { f: process.env.FUTURE_CONCEPTS, d: process.env.DEMO_CONTENT };
afterEach(() => {
  if (OLD.f === undefined) delete process.env.FUTURE_CONCEPTS; else process.env.FUTURE_CONCEPTS = OLD.f;
  if (OLD.d === undefined) delete process.env.DEMO_CONTENT; else process.env.DEMO_CONTENT = OLD.d;
});

describe("future work", () => {
  it("marks every topic except wudu as future and does not let future prerequisites block wudu", async () => {
    delete process.env.FUTURE_CONCEPTS;
    const cur = applyAvailability(await createLocalStore().getCurriculum());
    const by = Object.fromEntries(cur.concepts.map((c) => [c.id, c]));
    expect(futureConceptIds().sort()).toEqual(["five-pillars", "quran", "salah", "shahada", "tawhid"]);
    expect(by.wudu.availability).toBeUndefined();
    expect(by.wudu.prerequisites).toEqual([]);
    expect(by.salah.availability).toBe("future");
    // the recommended next step is the live landmark, never a future one
    expect(recommend(cur.concepts, emptyProgress()).primary?.id).toBe("wudu");
  });
  it("FUTURE_CONCEPTS='' turns it off", () => {
    process.env.FUTURE_CONCEPTS = "";
    expect(futureConceptIds()).toEqual([]);
  });
});

describe("demo items (built only from the clip's step order)", () => {
  it("is off unless DEMO_CONTENT=1", () => {
    delete process.env.DEMO_CONTENT;
    expect(demoEnabled()).toBe(false);
    process.env.DEMO_CONTENT = "1";
    expect(demoEnabled()).toBe(true);
  });
  it("builds one question per step plus an ordering question, all answerable from the clip order", async () => {
    const vid = (await createLocalStore().getVideos("wudu")).find((v) => v.id === "wudu-main")!;
    const steps = usedSteps(vid);
    for (const lang of ["en", "ar"] as const) {
      const items = buildDemoItems(vid, lang);
      expect(items).toHaveLength(steps.length + 1);
      items.forEach(({ item }, i) => {
        expect(item.status).toBe("draft");
        expect(item.lang).toBe(lang);
        if (item.type === "mcq") {
          const s = steps[i];
          const expected = steps[i + 1] ?? s;
          expect(item.answer).toBe(`s${expected.n}`);
          expect(item.options.length).toBe(3);
          expect(new Set(item.options.map((o) => o.text)).size).toBe(3);
          expect(gradeItem(item, `s${expected.n}`)).toBe(true);
        } else {
          expect(item.answer).toEqual(steps.map((s) => `s${s.n}`));
          expect(gradeItem(item, steps.map((s) => `s${s.n}`))).toBe(true);
        }
      });
    }
  });
});
