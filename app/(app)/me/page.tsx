import { getLocale, getTranslations } from "next-intl/server";
import { MeHome } from "@/components/me-home";
import { getStore } from "@/lib/data";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const t = await getTranslations("me");
  const locale = (await getLocale()) as Lang;
  const { concepts } = await getStore().getCurriculum();
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <MeHome concepts={concepts} locale={locale} />
    </section>
  );
}
