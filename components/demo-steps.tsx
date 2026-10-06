import { getTranslations } from "next-intl/server";
import { stepLabel, usedSteps } from "@/lib/demo";
import type { Lang, VideoEntry } from "@/lib/types";

/** Demo only: the steps as listed for the clip (order only, no explanation, not reviewed). */
export async function DemoSteps({ video, lang }: { video: VideoEntry; lang: Lang }) {
  const t = await getTranslations("unit");
  return (
    <div className="space-y-2">
      <p role="note" className="rounded-[var(--radius-btn)] bg-accent-soft p-3 text-sm">{t("demoNote")}</p>
      <h3 className="font-bold">{t("demoSteps")}</h3>
      <ol className="space-y-2">
        {usedSteps(video).map((s) => (
          <li key={s.n} className="flex items-center gap-3 rounded-[var(--radius-btn)] border-[3px] border-outline bg-surface px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-fg" aria-label={t("demoStep", { n: s.n })}>{s.n}</span>
            <span>{stepLabel(s, lang)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
