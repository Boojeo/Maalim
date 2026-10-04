import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MentorDashboard } from "@/components/mentor-dashboard";

export const metadata: Metadata = { title: "Mentor dashboard", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const t = await getTranslations("mentor");
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted">{t("intro")}</p>
      <MentorDashboard />
    </main>
  );
}
