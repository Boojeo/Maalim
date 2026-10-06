import { getTranslations } from "next-intl/server";
import { demoEnabled } from "@/lib/demo";

/** Permanent amber banner while DEMO_CONTENT=1: the content shown is illustration only. */
export async function DemoBanner() {
  if (!demoEnabled()) return null;
  const t = await getTranslations("banner");
  return (
    <div role="note" className="sticky top-0 z-40 bg-accent px-4 py-2 text-center text-sm font-bold text-ink">
      {t("demo")}
    </div>
  );
}
