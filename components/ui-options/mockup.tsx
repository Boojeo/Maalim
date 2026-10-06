import { BookOpen, Check, Dumbbell, Film, Lock, Map as MapIcon, Play, User } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";
import { getStore } from "@/lib/data";
import type { UiOption } from "@/lib/ui-options";

type Screen = "home" | "unit";

/** Static mockup of one screen in one design direction. No behaviour: it only shows look and layout. */
export async function PhoneMockup({ option, screen }: { option: UiOption; screen: Screen }) {
  const t = option.t;
  const locale = await getLocale();
  const tm = await getTranslations("map");
  const tn = await getTranslations("nav");
  const tu = await getTranslations("unit");
  const tp = await getTranslations("pending");
  const tv = await getTranslations("video");
  const ti = await getTranslations("item");
  const { concepts } = await getStore().getCurriculum();
  const name = (c: { title_ar: string; title_en: string }) => (locale === "ar" ? c.title_ar : c.title_en);
  const dir = locale === "ar" ? "rtl" : "ltr";

  const border = `${t.borderW}px solid ${t.line}`;
  const card: CSSProperties = { background: t.surface, border, borderRadius: t.radiusCard, boxShadow: t.shadow, padding: t.pad };
  const btn = (solid: boolean): CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center", minHeight: 44, flex: 1, padding: "0 16px", fontWeight: 600, fontSize: 16,
    borderRadius: t.radiusBtn, border: `${t.borderW}px solid ${solid ? (option.id === "C" ? t.line : t.primary) : t.primary}`,
    background: solid ? t.primary : t.surface, color: solid ? t.primaryFg : t.primary, boxShadow: t.btnShadow,
  });
  const states = ["done", "in_progress", "available", "locked", "locked", "locked"] as const;
  const nodeSize = option.id === "C" ? 52 : option.id === "B" ? 38 : 46;

  const home = (
    <>
      <h1 style={{ margin: "4px 0 2px", fontSize: t.titleSize, fontWeight: t.titleWeight }}>{tm("title")}</h1>
      <p style={{ margin: "0 0 14px", color: t.muted }}>{tm("intro")}</p>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
        {[...concepts].sort((a, b) => a.order - b.order).slice(0, 4).map((c, i) => {
          const s = states[i];
          const done = s === "done";
          const cur = s === "in_progress";
          return (
            <li key={c.id} style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <span
                aria-hidden
                style={{
                  width: nodeSize, height: nodeSize, flexShrink: 0, display: "grid", placeItems: "center",
                  borderRadius: option.id === "B" ? 10 : 999, border: `${Math.max(2, t.borderW)}px solid ${s === "locked" ? t.line : option.id === "C" ? t.line : t.primary}`,
                  background: done ? t.accent : cur && option.id === "C" ? t.primary : t.surface, color: cur && option.id === "C" ? t.primaryFg : t.ink,
                  boxShadow: cur ? `0 0 0 4px ${t.accentSoft}` : option.id === "C" ? t.btnShadow : "none",
                }}
              >
                {done ? <Check size={20} /> : s === "locked" ? <Lock size={18} color={t.muted} /> : <Play size={18} />}
              </span>
              <div style={{ ...card, flex: 1, padding: t.pad - 4 }}>
                <div style={{ fontSize: 13, color: t.muted }}>{c.level}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{name(c)}</div>
                <div style={{ fontSize: 14, color: s === "locked" ? t.muted : t.primary, fontWeight: 600 }}>{tm(`status.${s}`)}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );

  const wudu = concepts.find((c) => c.id === "wudu") ?? concepts[0];
  const unit = (
    <>
      <h1 style={{ margin: "4px 0 2px", fontSize: t.titleSize, fontWeight: t.titleWeight }}>{name(wudu)}</h1>
      <p style={{ margin: "0 0 6px", color: t.muted, fontSize: 14 }}>{tu("stepOf", { n: 2, total: 5 })}</p>
      <div aria-hidden style={{ display: "flex", gap: option.id === "C" ? 6 : 4, marginBottom: 14 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ flex: 1, height: option.id === "C" ? 12 : 6, borderRadius: 99, background: n <= 2 ? t.accent : t.accentSoft, border: option.id === "C" ? `2px solid ${t.line}` : "none" }} />
        ))}
      </div>
      <div style={{ ...card, display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 17, color: t.primary }}>{tu("video")}</h2>
        <div
          role="img"
          aria-label={tv("placeholder")}
          style={{ aspectRatio: "16 / 9", display: "grid", placeItems: "center", textAlign: "center", background: t.accentSoft, border: `2px dashed ${option.id === "C" ? t.line : t.accent}`, borderRadius: Math.max(8, t.radiusCard - 6), color: t.ink, padding: 8 }}
        >
          <span style={{ display: "grid", justifyItems: "center", gap: 4 }}>
            <Film aria-hidden size={26} color={t.primary} />
            <strong>{tv("placeholder")}</strong>
            <span style={{ fontSize: 13 }}>{tv("permission")}</span>
          </span>
        </div>
        <p style={{ margin: 0, color: t.muted, fontSize: 13 }}>{tv("creditPending")} · {tv("captionsOn")}</p>
        <h2 style={{ margin: "4px 0 0", fontSize: 17, color: t.primary }}>{tu("explanation")}</h2>
        <div style={{ background: t.accentSoft, borderRadius: Math.max(8, t.radiusCard - 6), padding: 12, color: t.ink, fontSize: 15 }}>
          <strong>{tp("label")}</strong>
          <div>{tp("body")}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", color: t.muted, fontSize: 13 }}>
          <span>{locale === "ar" ? "مثال لشرح مع مصادر" : "Sample cited sentence"}</span>
          {["[1]", "[2]"].map((c) => (
            <span key={c} style={{ minWidth: 40, minHeight: 40, display: "inline-grid", placeItems: "center", borderRadius: 999, border: `${Math.max(1, t.borderW)}px solid ${option.id === "C" ? t.line : t.primary}`, color: t.primary, background: t.surface, fontWeight: 600 }}>{c}</span>
          ))}
        </div>
        <h2 style={{ margin: "4px 0 0", fontSize: 17, color: t.primary }}>{tu("check")}</h2>
        {["A", "B", "C"].map((o) => (
          <div key={o} style={{ minHeight: 44, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", border, borderRadius: t.radiusBtn, background: o === "B" ? t.accentSoft : t.surface }}>
            <span aria-hidden style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${t.primary}`, background: o === "B" ? t.primary : "transparent" }} />
            {locale === "ar" ? `خيار ${o}` : `Option ${o}`}
          </div>
        ))}
        <div style={{ display: "flex" }}>
          <span style={btn(true)}>{ti("submit")}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <span style={btn(false)}>{tu("previous")}</span>
        <span style={btn(true)}>{tu("next")}</span>
      </div>
    </>
  );

  const nav = [
    { k: "map", Icon: MapIcon, active: screen === "home" },
    { k: "learn", Icon: BookOpen, active: screen === "unit" },
    { k: "practise", Icon: Dumbbell, active: false },
    { k: "me", Icon: User, active: false },
  ] as const;

  return (
    <div
      data-testid="mockup"
      dir={dir}
      lang={locale}
      style={{ width: 340, background: t.bg, color: t.ink, border: "1px solid #9aa5b1", borderRadius: 28, overflow: "hidden", position: "relative", fontSize: 16, lineHeight: locale === "ar" ? 1.8 : 1.5 }}
    >
      <div style={{ padding: `12px ${t.pad - 4}px 0`, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: option.id === "B" ? border : "none", paddingBottom: option.id === "B" ? 10 : 0 }}>
        <strong style={{ color: t.primary, fontSize: 20, fontWeight: option.id === "C" ? 800 : 700 }}>{locale === "ar" ? "معالم" : "Ma'ālim"}</strong>
        <span style={{ ...btn(false), flex: "none", minHeight: 40, padding: "0 12px", fontSize: 14 }}>{locale === "ar" ? "English" : "العربية"}</span>
      </div>
      <div style={{ padding: `10px ${t.pad - 4}px 18px`, minHeight: 520 }}>{screen === "home" ? home : unit}</div>
      <div style={{ display: "flex", borderTop: border, background: t.surface }}>
        {nav.map(({ k, Icon, active }) => (
          <span key={k} style={{ flex: 1, minHeight: 56, display: "grid", placeItems: "center", alignContent: "center", fontSize: 13, color: active ? t.primary : t.muted, fontWeight: active ? 700 : 400, borderTop: active && option.id === "B" ? `3px solid ${t.primary}` : "3px solid transparent", background: active && option.id === "C" ? t.accentSoft : "transparent" }}>
            <Icon aria-hidden size={20} />
            {tn(k)}
          </span>
        ))}
      </div>
    </div>
  );
}
