import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Hourglass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Shown instead of a unit for topics that are not built yet. */
export async function FutureWork({ title, liveHref }: { title: string; liveHref: string | null }) {
  const t = await getTranslations("map");
  const f = await getTranslations("future");
  return (
    <Card className="space-y-4 border-dashed">
      <p className="flex items-center gap-2 text-sm font-bold text-primary">
        <Hourglass aria-hidden className="size-5" />
        {f("title")}
      </p>
      <h1 className="text-3xl font-bold">{title}</h1>
      <p>{f("body")}</p>
      <div className="flex flex-col gap-2">
        {liveHref ? (
          <Button asChild>
            <Link href={liveHref}>{f("cta")}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link href="/">{f("back")}</Link>
        </Button>
      </div>
      <span className="sr-only">{t("future")}</span>
    </Card>
  );
}
