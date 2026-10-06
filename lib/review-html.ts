// Shared helpers for the reviewer PDFs (scripts/review-pack.ts, scripts/candidates-pack.ts).
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const isAr = (s: string) => /[؀-ۿ]/.test(s);
export const cell = (s: unknown) => `<td${isAr(String(s)) ? ' dir="rtl" lang="ar"' : ""}>${esc(s).replace(/\n/g, "<br>")}</td>`;
export const decision = '<td class="dec">☐ Approve &nbsp; ☐ Edit &nbsp; ☐ Reject<br><br>Note:</td>';

export function table(head: string[], rows: string[][], withDecision = false, decisionCell = decision): string {
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}${withDecision ? "<th>Decision</th>" : ""}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map(cell).join("")}${withDecision ? decisionCell : ""}</tr>`)
    .join("")}</tbody></table>`;
}

const root = process.cwd();
const font = (w: number, subset: string) =>
  `@font-face{font-family:"Plex";font-weight:${w};src:url("file://${root}/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-${subset}-${w}-normal.woff2") format("woff2");unicode-range:${subset === "arabic" ? "U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF" : "U+0000-00FF"};}`;

export const PAGE_CSS = `${[400, 700].flatMap((w) => [font(w, "arabic"), font(w, "latin")]).join("\n")}
@page{size:A4;margin:14mm}
body{font-family:"Plex",system-ui,sans-serif;font-size:10.5pt;line-height:1.5;color:#1F2933}
h1{color:#5B21B6;font-size:20pt}h2{color:#5B21B6;border-bottom:2px solid #F59E0B;padding-bottom:3px;margin-top:22px;page-break-after:avoid}h3{margin-bottom:4px;page-break-after:avoid}
table{border-collapse:collapse;width:100%;margin:6px 0 14px;font-size:9pt}th,td{border:1px solid #bbb;padding:4px 6px;vertical-align:top;text-align:start}th{background:#f1ece2}
td[dir=rtl]{font-size:10.5pt}.dec{width:120px;font-size:8.5pt;color:#444}.box{border:2px solid #5B21B6;border-radius:8px;padding:6px 12px}.meta,.note{color:#52606D}
tr{page-break-inside:avoid}code{background:#f1ece2;padding:0 3px}`;

export async function writePack(name: string, title: string, bodyHtml: string): Promise<void> {
  const out = path.join(root, "review");
  fs.mkdirSync(out, { recursive: true });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${PAGE_CSS}</style></head><body>${bodyHtml}</body></html>`;
  fs.writeFileSync(path.join(out, `${name}.html`), html);
  const exe = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined });
  const page = await browser.newPage();
  await page.goto(`file://${path.join(out, `${name}.html`)}`);
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: path.join(out, `${name}.pdf`), format: "A4", printBackground: true, margin: { top: "14mm", bottom: "14mm", left: "12mm", right: "12mm" } });
  await browser.close();
  console.log(`wrote review/${name}.html and review/${name}.pdf`);
}
