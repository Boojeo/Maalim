"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-bold">{t("error")}</h1>
      <p className="text-muted">{t("errorBody")}</p>
      <Button onClick={reset}>{t("retry")}</Button>
      <Button asChild variant="outline">
        <a href="/fallback.html">{t("fallback")}</a>
      </Button>
    </main>
  );
}
