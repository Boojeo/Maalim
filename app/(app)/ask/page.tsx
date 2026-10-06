import { getLocale, getTranslations } from "next-intl/server";
import { AskFlow } from "@/components/ask-flow";
import { needsBanner } from "@/lib/content-gate";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const t = await getTranslations("ask");
  const locale = await getLocale();
  const { concepts } = await getStore().getCurriculum();
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <AskFlow concepts={concepts.map((c) => ({ id: c.id, title: locale === "ar" ? c.title_ar : c.title_en }))} showDev={needsBanner()} initialQuestion={(q ?? "").slice(0, 500)} />
    </section>
  );
}
