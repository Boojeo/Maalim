import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReviewQueue } from "@/components/review-queue";

export const metadata: Metadata = { title: "Review queue", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const t = await getTranslations("admin");
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <ReviewQueue />
    </main>
  );
}
