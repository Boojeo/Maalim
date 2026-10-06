// Screenshots each design option (home + unit) in English and Arabic from a running server.
// Usage: BASE_URL=http://localhost:3100 npx tsx scripts/screens-options.ts
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = path.join(process.cwd(), "design", "screens", "options");
const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  for (const locale of ["ar", "en"] as const) {
    const ctx = await browser.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 1.5 });
    await ctx.addCookies([{ name: "NEXT_LOCALE", value: locale, url: base }]);
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(`${base}/dev/ui-options`, { waitUntil: "networkidle" });
    for (const id of ["A", "B", "C"]) {
      const section = page.locator(`section[aria-labelledby="opt-${id}"]`);
      const phones = section.getByTestId("mockup");
      await section.screenshot({ path: path.join(out, `overview-${id}.${locale}.png`) });
      await phones.nth(0).screenshot({ path: path.join(out, `option-${id}-home.${locale}.png`) });
      await phones.nth(1).screenshot({ path: path.join(out, `option-${id}-unit.${locale}.png`) });
    }
    await ctx.close();
    if (errors.length) console.error(errors.join("\n"));
  }
  await browser.close();
  console.log("ok: design/screens/options");
}
main();
