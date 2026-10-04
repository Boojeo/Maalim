import { useTranslations } from "next-intl";
import { Clock } from "lucide-react";

/** Shown wherever reviewed content does not exist yet. The raw placeholder is dev-only. */
export function ContentPending({ raw, showRaw = false }: { raw?: string; showRaw?: boolean }) {
  const t = useTranslations("pending");
  return (
    <div
      role="note"
      className="flex gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-accent bg-accent-soft p-4 text-ink"
    >
      <Clock aria-hidden className="mt-1 size-5 shrink-0 text-primary" />
      <div className="space-y-1">
        <p className="font-bold">{t("label")}</p>
        <p>{t("body")}</p>
        {showRaw && raw ? (
          <p dir="ltr" lang="en" className="text-sm text-muted">
            {raw}
          </p>
        ) : null}
      </div>
    </div>
  );
}
