import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("me");
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("privacy")}</p>
    </section>
  );
}
