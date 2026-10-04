import { useTranslations } from "next-intl";
import type { Passage } from "@/lib/types";

export const SOURCE_LABEL: Record<Passage["source"], string> = {
  quranenc: "QuranEnc",
  hadeethenc: "HadeethEnc",
  islamhouse: "IslamHouse",
};

/** A citation chip that expands to the verbatim source passage. */
export function CitationChip({ n, passage }: { n: number; passage: Passage }) {
  const t = useTranslations("sources");
  return (
    <details className="inline-block align-baseline">
      <summary
        className="inline-flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-full border border-primary bg-surface px-3 text-sm font-medium text-primary hover:bg-accent-soft"
        aria-label={`${t("title")} ${n}: ${SOURCE_LABEL[passage.source]} ${passage.source_id}`}
      >
        [{n}]
      </summary>
      <div className="mt-2 w-full max-w-prose space-y-2 rounded-[var(--radius-btn)] border border-line bg-surface p-3 text-start">
        <p className="text-sm font-bold text-muted">{t("verbatim")}</p>
        <blockquote lang={passage.lang} dir={passage.lang === "ar" ? "rtl" : "ltr"} className="text-ink">
          {passage.text}
        </blockquote>
        <p className="text-sm text-muted" dir="ltr">
          {t("from", { source: SOURCE_LABEL[passage.source], id: passage.source_id })}
        </p>
        {passage.source_url && passage.source_url !== "TODO" ? (
          <a href={passage.source_url} className="text-sm font-medium text-primary underline" rel="noreferrer" target="_blank">
            {t("open")}
          </a>
        ) : null}
      </div>
    </details>
  );
}
