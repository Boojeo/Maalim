import type { Metadata } from "next";
import { envReport, getEnv } from "@/lib/env";
import { contentStatus } from "@/lib/content-status";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Dev · content status" };
export const dynamic = "force-dynamic";

export default function DevPage() {
  const env = getEnv();
  const rows = contentStatus();
  const totalVerified = rows.reduce((n, r) => n + r.verified, 0);

  return (
    <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-6" dir="ltr" lang="en">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Dev · content status</h1>
        <p className="text-muted">
          Developer view. Learners never see unverified content. Verified passages in total:{" "}
          <strong>{totalVerified}</strong>.
        </p>
        <p className="flex flex-wrap gap-2">
          <Badge tone="primary">LLM: {env.llmProvider}</Badge>
          <Badge tone="primary">Embeddings: {env.embeddingProvider}</Badge>
          <Badge tone="primary">DB: {env.supabaseConfigured ? "supabase" : "local JSON"}</Badge>
          <Badge tone={env.allowUnverified ? "warn" : "neutral"}>
            DEV_ALLOW_UNVERIFIED: {env.allowUnverified ? "on" : "off"}
          </Badge>
        </p>
      </header>

      <section aria-labelledby="concepts-h" className="space-y-3">
        <h2 id="concepts-h" className="text-xl font-bold">Concepts</h2>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Concepts table (scrollable)">
          <table className="w-full min-w-[34rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-b border-line text-start">
                <th scope="col" className="py-2 pe-3 text-start">Concept</th>
                <th scope="col" className="py-2 pe-3 text-start">Level</th>
                <th scope="col" className="py-2 pe-3 text-start">Reviewed</th>
                <th scope="col" className="py-2 pe-3 text-start">Passages (verified / placeholder / total)</th>
                <th scope="col" className="py-2 text-start">Videos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line align-top">
                  <th scope="row" className="py-2 pe-3 text-start font-medium">{r.title_en}</th>
                  <td className="py-2 pe-3">{r.level}</td>
                  <td className="py-2 pe-3">{r.reviewed_by ?? "no"}</td>
                  <td className="py-2 pe-3">{r.verified} / {r.placeholders} / {r.passages}</td>
                  <td className="py-2">
                    {r.videos.length === 0
                      ? "none"
                      : r.videos.map((v) => (
                          <div key={v.id}>
                            {v.id} ({v.kind}): permission {v.permission}
                            {v.credit.startsWith("TODO") ? ", credit TODO" : ""}
                          </div>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="env-h" className="space-y-3">
        <h2 id="env-h" className="text-xl font-bold">Environment (names only)</h2>
        <ul className="space-y-1 text-sm">
          {envReport().map((e) => (
            <li key={e.name}>
              <code>{e.name}</code>: {e.set ? "set" : `missing → ${e.fallback}`}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
