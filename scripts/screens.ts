// Screenshots at 360px in ar (RTL) and en, plus console-error check.
// Usage: BASE_URL=http://localhost:3100 npx tsx scripts/screens.ts [route ...]
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const outDir = path.join(process.cwd(), "design", "screens");
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/learn", "/practise", "/me", "/dev"];
const exe = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const problems: string[] = [];
  for (const locale of ["ar", "en"] as const) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, deviceScaleFactor: 2 });
    await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: base }]);
    const page = await ctx.newPage();
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(`[${locale}] console error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`[${locale}] page error: ${e.message}`));
    for (const route of routes) {
      const res = await page.goto(base + route, { waitUntil: "networkidle" });
      if (!res || res.status() >= 400) problems.push(`[${locale}] ${route} -> HTTP ${res?.status()}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) problems.push(`[${locale}] ${route}: horizontal overflow at 360px`);
      const name = (route === "/" ? "home" : route.replace(/[\/?=&]+/g, "_").replace(/^_/, "")) + `.${locale}.png`;
      await page.screenshot({ path: path.join(outDir, name), fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`ok: ${routes.length} routes x 2 locales -> design/screens`);
}
main();
