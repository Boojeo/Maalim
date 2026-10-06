import { getLocale, getTranslations } from "next-intl/server";
import { LearnHome } from "@/components/learn-home";
import { getStore } from "@/lib/data";
import type { Lang } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const t = await getTranslations("learn");
  const locale = (await getLocale()) as Lang;
  const { concepts } = await getStore().getCurriculum();
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <LearnHome concepts={concepts} locale={locale} />
    </section>
  );
}
