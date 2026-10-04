import { useTranslations } from "next-intl";
import { CitationChip } from "@/components/citation-chip";
import { ContentPending } from "@/components/content-pending";
import type { Passage } from "@/lib/types";

/**
 * Phase 3: verbatim verified passages with citation chips. Phase 4 replaces this with the
 * guarded generated explanation from /api/explain (same visual contract).
 */
export function Explanation({ passages, showDev }: { passages: Passage[]; showDev: boolean }) {
  const t = useTranslations("sources");
  if (passages.length === 0) {
    return <ContentPending showRaw={showDev} raw="[CONTENT NEEDED: verified passages for this concept]" />;
  }
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-muted">{t("verbatim")}</h3>
      {passages.map((p, i) => (
        <p key={p.id} lang={p.lang} dir={p.lang === "ar" ? "rtl" : "ltr"} className="space-x-2 rtl:space-x-reverse">
          <span>{p.text}</span> <CitationChip n={i + 1} passage={p} />
        </p>
      ))}
    </div>
  );
}
