"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const KEY = "maalim.welcomed.v1";
const subscribeNone = () => () => undefined;

/** First-visit welcome: states that nothing is stored about the learner and links to stage choice. */
export function WelcomeCard() {
  const t = useTranslations("welcome");
  const [tick, setTick] = useState(0);
  const seen = useSyncExternalStore(
    subscribeNone,
    () => {
      try {
        return `${tick}:${window.localStorage.getItem(KEY) === "1"}`;
      } catch {
        return `${tick}:false`;
      }
    },
    () => "0:true", // render hidden on the server to avoid a flash
  ).endsWith(":true");
  if (seen) return null;
  return (
    <Card className="space-y-3" role="region" aria-label={t("title")}>
      <h2 className="text-lg font-bold">{t("title")}</h2>
      <p>{t("body")}</p>
      <div className="flex gap-2">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/me">{t("stage")}</Link>
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            try {
              window.localStorage.setItem(KEY, "1");
            } catch {
              /* ignore */
            }
            setTick((n) => n + 1);
          }}
        >
          {t("dismiss")}
        </Button>
      </div>
    </Card>
  );
}
