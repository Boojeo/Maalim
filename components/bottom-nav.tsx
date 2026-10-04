"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { BookOpen, Dumbbell, Map as MapIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", key: "map", Icon: MapIcon },
  { href: "/learn", key: "learn", Icon: BookOpen },
  { href: "/practise", key: "practise", Icon: Dumbbell },
  { href: "/me", key: "me", Icon: User },
] as const;

export function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ href, key, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm",
                  active ? "font-bold text-primary" : "text-muted",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
