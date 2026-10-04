import { getTranslations } from "next-intl/server";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitch } from "@/components/language-switch";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-xl font-bold text-primary">{t("name")}</span>
        <LanguageSwitch />
      </header>
      <main id="main" className="flex-1 px-4 pb-28 pt-2">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
