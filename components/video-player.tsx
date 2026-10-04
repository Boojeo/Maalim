"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResolvedVideo } from "@/lib/videos";

const BLOCK_KEY = {
  permission: "permission",
  "missing-file": "missingFile",
  "missing-captions": "missingCaptions",
} as const;

/** Plays encoded clips with captions on by default. A blocked/missing clip becomes a labelled placeholder. */
export function VideoPlayer({ video }: { video: ResolvedVideo }) {
  const t = useTranslations("video");
  const locale = useLocale();
  const [index, setIndex] = useState(0);

  const sources = video.clips.length > 0 ? video.clips : video.fullSrc ? [{ n: 0, key: "full", label_en: "", src: video.fullSrc }] : [];

  if (video.blocked || sources.length === 0) {
    const reason = video.blocked ?? "missing-file";
    return (
      <figure className="space-y-2">
        <div
          role="img"
          aria-label={`${t("placeholder")}. ${t(BLOCK_KEY[reason])}`}
          className="flex aspect-video flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed border-accent bg-accent-soft p-4 text-center"
        >
          <Film aria-hidden className="size-8 text-primary" />
          <p className="font-bold">{t("placeholder")}</p>
          <p className="text-sm">{t(BLOCK_KEY[reason])}</p>
        </div>
        <figcaption className="text-sm text-muted">{video.credit ? t("credit", { credit: video.credit }) : t("creditPending")}</figcaption>
      </figure>
    );
  }

  const current = sources[Math.min(index, sources.length - 1)];
  const order: ("ar" | "en")[] = locale === "ar" ? ["ar", "en"] : ["en", "ar"];

  return (
    <figure className="space-y-2">
      <video
        key={current.src}
        controls
        playsInline
        preload="metadata"
        src={current.src}
        className="aspect-video max-h-[70dvh] w-full rounded-[var(--radius-card)] bg-ink"
      >
        {order.map((l, i) =>
          video.captions[l] ? (
            <track
              key={l}
              kind="captions"
              srcLang={l}
              label={l === "ar" ? "العربية" : "English"}
              src={video.captions[l]}
              default={i === 0 || !video.captions[order[0]]}
            />
          ) : null,
        )}
      </video>
      {sources.length > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            {t("previousClip")}
          </Button>
          <span className="text-sm text-muted">{t("clipOf", { n: index + 1, total: sources.length })}</span>
          <Button variant="ghost" onClick={() => setIndex((i) => Math.min(sources.length - 1, i + 1))} disabled={index === sources.length - 1}>
            {t("nextClip")}
          </Button>
        </div>
      ) : null}
      <figcaption className="text-sm text-muted">
        {video.credit ? t("credit", { credit: video.credit }) : t("creditPending")} · {t("captionsOn")}
      </figcaption>
    </figure>
  );
}
