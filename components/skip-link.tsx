import { getTranslations } from "next-intl/server";

export async function SkipLink() {
  const t = await getTranslations("common");
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[60] focus:rounded-[var(--radius-btn)] focus:bg-surface focus:px-4 focus:py-3 focus:font-bold focus:text-primary focus:shadow-lg"
    >
      {t("skip")}
    </a>
  );
}
