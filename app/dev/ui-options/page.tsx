import type { Metadata } from "next";
import { PhoneMockup } from "@/components/ui-options/mockup";
import { UI_OPTIONS } from "@/lib/ui-options";

export const metadata: Metadata = { title: "Design options", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function UiOptionsPage() {
  return (
    <main id="main" className="mx-auto max-w-5xl space-y-10 px-4 py-6" dir="ltr" lang="en">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Design options</h1>
        <p className="text-muted">
          Three directions for the home (map) and unit screens, as static mockups at phone width. The live app still uses option A (the brief&apos;s default) until you choose.
          Switch the language with the button in the app header on any page to see Arabic (RTL) or English. Tell the assistant: <strong>A</strong>, <strong>B</strong>, <strong>C</strong>, or a mix such as
          &ldquo;B&apos;s layout with A&apos;s colours&rdquo;.
        </p>
      </header>
      {UI_OPTIONS.map((o) => (
        <section key={o.id} aria-labelledby={`opt-${o.id}`} className="space-y-4">
          <h2 id={`opt-${o.id}`} className="text-xl font-bold">
            Option {o.id}: {o.name}
          </h2>
          <p>{o.tagline}</p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-bold">Good</p>
              <ul className="list-disc ps-5">
                {o.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold">Trade-offs</p>
              <ul className="list-disc ps-5">
                {o.cons.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-sm text-muted">All text colours in this option pass WCAG AA contrast (checked by a test). Gold/amber accents are decorative only.</p>
          <div className="flex flex-wrap items-start gap-6">
            <PhoneMockup option={o} screen="home" />
            <PhoneMockup option={o} screen="unit" />
          </div>
        </section>
      ))}
    </main>
  );
}
