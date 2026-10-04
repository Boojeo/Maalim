// Writes public/fallback.html: a static, no-JavaScript page listing the six landmarks, used if the app is
// down or the database sleeps. Titles only: no religious content is written here. Run: npx tsx scripts/build-fallback.ts
import fs from "node:fs";
import path from "node:path";
import type { Curriculum } from "../lib/types";

const cur = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "curriculum.json"), "utf8")) as Curriculum;
const items = [...cur.concepts].sort((a, b) => a.order - b.order);
const li = (t: string) => `<li>${t}</li>`;
const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>معالم · Ma'ālim</title>
<style>
  body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#FAF7F2;color:#1F2933;margin:0;padding:24px;line-height:1.8;font-size:17px}
  main{max-width:36rem;margin:0 auto}
  h1{color:#0F5E5A;margin-top:0}
  .card{background:#fff;border:1px solid #e4ddd0;border-radius:16px;padding:16px 20px;margin:16px 0}
  ol{padding-inline-start:1.25rem}
  a{color:#0F5E5A}
  [lang=en]{direction:ltr;text-align:left}
</style>
</head>
<body>
<main>
<h1>معالم</h1>
<p>الخدمة غير متاحة مؤقتًا. هذه نسخة مبسّطة تعرض مسار التعلّم فقط. لم نحفظ أي معلومات عنك.</p>
<div class="card"><ol>
${items.map((c) => li(c.title_ar)).join("\n")}
</ol></div>
<p><a href="/">حاول فتح التطبيق مرة أخرى</a></p>
<hr>
<section lang="en">
<h1>Ma'ālim</h1>
<p>The service is temporarily unavailable. This simple version only shows the learning path. Nothing was stored about you.</p>
<div class="card"><ol>
${items.map((c) => li(c.title_en)).join("\n")}
</ol></div>
<p><a href="/">Try opening the app again</a></p>
</section>
</main>
</body>
</html>
`;
fs.writeFileSync(path.join(process.cwd(), "public", "fallback.html"), html);
console.log("wrote public/fallback.html");
