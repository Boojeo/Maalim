"use client";

// Last resort when the root layout itself fails: no providers, plain markup, static fallback link.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, background: "#FAF7F2", color: "#1F2933" }}>
        <h1>حدث خطأ · Something went wrong</h1>
        <p>تقدّمك محفوظ على جهازك. · Your progress is safe on this device.</p>
        <p>
          <button onClick={reset} style={{ minHeight: 44, padding: "0 20px" }}>حاول مرة أخرى · Try again</button>
        </p>
        <p>
          <a href="/fallback.html">النسخة المبسّطة · Simple version</a>
        </p>
      </body>
    </html>
  );
}
