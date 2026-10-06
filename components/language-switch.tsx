"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALE_COOKIE } from "@/i18n/config";

export function LanguageSwitch() {
  const t = useTranslations("lang");
  const locale = useLocale();
  const router = useRouter();

  function toggle() {
    const next = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("switchLabel")}
      lang={locale === "ar" ? "en" : "ar"}
      className="min-h-11 min-w-11 rounded-[var(--radius-btn)] border-[3px] border-outline bg-surface px-4 text-base font-bold text-primary shadow-btn hover:bg-accent-soft active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
    >
      {t("switchTo")}
    </button>
  );
}
