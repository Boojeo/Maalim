import { getTranslations } from "next-intl/server";
import { getEnv } from "@/lib/env";

/** Permanent red banner whenever DEV_ALLOW_UNVERIFIED=1 (CLAUDE.md rule 2). */
export async function UnverifiedBanner() {
  if (!getEnv().allowUnverified) return null;
  const t = await getTranslations("banner");
  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-danger-bg px-4 py-2 text-center text-sm font-bold text-white"
    >
      {t("unverified")}
    </div>
  );
}
