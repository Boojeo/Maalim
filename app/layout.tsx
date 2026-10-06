import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { dirOf, type Locale } from "@/i18n/config";
import { SkipLink } from "@/components/skip-link";
import { UnverifiedBanner } from "@/components/unverified-banner";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return { title: { default: t("name"), template: `%s · ${t("name")}` }, description: t("tagline") };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#6D28D9" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SkipLink />
          <UnverifiedBanner />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
