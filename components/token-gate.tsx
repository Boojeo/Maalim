"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Headers = Record<string, string>;

/** Shows the page only once the server accepts the access token (or none is needed in development). */
export function TokenGate({
  endpoint,
  storageKey,
  children,
}: {
  endpoint: string;
  storageKey: string;
  children: (headers: Headers) => React.ReactNode;
}) {
  const t = useTranslations("admin");
  const [token, setToken] = useState(() => {
    try {
      return typeof window === "undefined" ? "" : (sessionStorage.getItem(storageKey) ?? "");
    } catch {
      return "";
    }
  });
  const [auth, setAuth] = useState<"unknown" | "needs-token" | "ok">("unknown");
  const [attempt, setAttempt] = useState(0);
  const headers: Headers = token ? { "x-admin-token": token } : {};

  useEffect(() => {
    let cancelled = false;
    const h: Headers = token ? { "x-admin-token": token } : {};
    fetch(`${endpoint}?probe=1`, { headers: h })
      .then((r) => r.json() as Promise<{ authorized: boolean }>)
      .then((j) => {
        if (!cancelled) setAuth(j.authorized ? "ok" : "needs-token");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // re-probe when the form is submitted (attempt), not on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, attempt]);

  if (auth === "unknown") return <p role="status" className="text-muted">…</p>;
  if (auth === "needs-token") {
    return (
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            sessionStorage.setItem(storageKey, token);
          } catch {
            /* ignore */
          }
          setAttempt((a) => a + 1);
        }}
      >
        <p>{t("unauthorized")}</p>
        <label className="block space-y-1">
          <span className="font-medium">{t("token")}</span>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)} className="min-h-11 w-full rounded-[var(--radius-btn)] border border-line bg-surface px-3" />
        </label>
        <Button type="submit">{t("enter")}</Button>
      </form>
    );
  }
  return <>{children(headers)}</>;
}
