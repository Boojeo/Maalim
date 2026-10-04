"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ItemPlayer, type ItemSource } from "@/components/item-player";
import { VideoPlayer } from "@/components/video-player";
import { recordAttempt } from "@/lib/progress";
import { useProgress } from "@/lib/progress-client";
import type { Item } from "@/lib/types";
import type { ResolvedVideo } from "@/lib/videos";

export interface PracticeEntry {
  item: Item;
  source: ItemSource | null;
  video: ResolvedVideo | null;
}

/** Plays approved items one by one; results go to local mastery only. */
export function PracticeSession({ entries }: { entries: PracticeEntry[] }) {
  const t = useTranslations("practise");
  const { update } = useProgress();
  const [i, setI] = useState(0);
  const [round, setRound] = useState(0);

  if (i >= entries.length) {
    return (
      <Card className="space-y-3">
        <h2 className="text-xl font-bold">{t("doneTitle")}</h2>
        <p>{t("doneBody")}</p>
        <Button onClick={() => { setI(0); setRound((r) => r + 1); }} className="w-full">{t("again")}</Button>
      </Card>
    );
  }
  const e = entries[i];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{t("item", { n: i + 1, total: entries.length })}</p>
      <Card className="space-y-4">
        {e.item.type === "scenario" ? <p className="text-sm font-bold text-primary">{t("scenario")}</p> : null}
        {e.video ? <VideoPlayer video={e.video} /> : null}
        <ItemPlayer
          key={`${round}-${e.item.id}`}
          item={e.item}
          source={e.source}
          onResult={(ok) => update((s) => recordAttempt(s, e.item.concept_id, ok))}
          onContinue={() => setI(i + 1)}
        />
      </Card>
    </div>
  );
}
