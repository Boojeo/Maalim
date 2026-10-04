import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = ["/", "/learn", "/learn/wudu", "/practise", "/ask", "/me", "/demo", "/dev"];

for (const locale of ["ar", "en"] as const) {
  test.describe(`accessibility (${locale}, 360px)`, () => {
    test.beforeEach(async ({ context, baseURL }) => {
      await context.addCookies([{ name: "NEXT_LOCALE", value: locale, url: baseURL! }]);
    });

    for (const route of pages) {
      test(`axe: ${route}`, async ({ page }) => {
        const errors: string[] = [];
        page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflow, "no horizontal scroll at 360px").toBe(false);
        expect(errors).toEqual([]);
      });
    }
  });
}

test("keyboard: skip link is the first focusable element and targets main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /Skip to content|تخطَّ إلى المحتوى/ });
  await expect(skip).toBeFocused();
  await expect(page.locator("#main")).toHaveCount(1);
});

test("html lang and dir follow the language switch", async ({ page, baseURL, context }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "ar", url: baseURL! }]);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await page.getByRole("button", { name: /Switch language|تغيير اللغة/ }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("error pages: 404 is calm and has a way home; health endpoint answers", async ({ page, request }) => {
  const res = await page.goto("/does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: /Back to the map|العودة إلى الخريطة/ })).toBeVisible();
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ ok: true, store: "local" });
  const fallback = await request.get("/fallback.html");
  expect(fallback.status()).toBe(200);
  expect(await fallback.text()).toContain("<ol>");
});

test("axe: token-gated pages once unlocked (mentor, review)", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "NEXT_LOCALE", value: "en", url: baseURL! }]);
  for (const [route, token, key] of [["/mentor", "e2e-mentor-token", "Access token"], ["/admin/review", "e2e-admin-token", "Access token"]] as const) {
    await page.goto(route);
    await page.getByLabel(key).fill(token);
    await page.getByRole("button", { name: "Open" }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${route} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  }
});
