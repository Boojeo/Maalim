import { getTranslations } from "next-intl/server";

export default async function Loading() {
  const t = await getTranslations("common");
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-muted">{t("loadingPage")}</p>
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-accent-soft" />
      <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-accent-soft" />
    </div>
  );
}
