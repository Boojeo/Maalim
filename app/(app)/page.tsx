import { getTranslations } from "next-intl/server";
import { ConceptPath } from "@/components/concept-path";
import { WelcomeCard } from "@/components/welcome-card";
import { getStore } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const t = await getTranslations("map");
  const { concepts } = await getStore().getCurriculum();
  return (
    <section className="space-y-4">
      <WelcomeCard />
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <ConceptPath concepts={concepts} />
    </section>
  );
}
