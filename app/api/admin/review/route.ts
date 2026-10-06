import { NextResponse } from "next/server";
import { z } from "zod";
import { isAuthorized } from "@/lib/admin-auth";
import { limited } from "@/lib/api-guard";
import { getStore } from "@/lib/data";
import { checkItem } from "@/lib/item-check";

export const dynamic = "force-dynamic";

/** Draft items with their auto-check results (answerable from source span, verified source). */
export async function GET(req: Request) {
  const tooMany = limited(req, "admin", 120);
  if (tooMany) return tooMany;
  // ?probe=1 answers 200 either way, so a locked page does not log a 401 in the browser console.
  if (new URL(req.url).searchParams.get("probe") === "1") return NextResponse.json({ authorized: isAuthorized(req, "ADMIN_TOKEN") });
  if (!isAuthorized(req, "ADMIN_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const store = getStore();
  const drafts = await store.getItems({ status: "draft", learner: false });
  const rows = await Promise.all(
    drafts.map(async (item) => {
      const passage = item.source_passage_id ? await store.getPassage(item.source_passage_id) : null;
      return { item, passage, check: checkItem(item, passage) };
    }),
  );
  const counts = {
    approved: (await store.getItems({ status: "approved", learner: false })).length,
    rejected: (await store.getItems({ status: "rejected", learner: false })).length,
    draft: drafts.length,
  };
  return NextResponse.json({ rows, counts });
}

const Body = z.object({
  id: z.string().min(1).max(200),
  decision: z.enum(["approved", "rejected"]),
  reviewer: z.string().trim().min(2).max(100),
});

export async function POST(req: Request) {
  const tooMany = limited(req, "admin", 120);
  if (tooMany) return tooMany;
  if (!isAuthorized(req, "ADMIN_TOKEN")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { id, decision, reviewer } = parsed.data;
  const store = getStore();
  const [item] = (await store.getItems({ learner: false })).filter((i) => i.id === id);
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (decision === "approved") {
    // Re-checked server-side: the UI cannot approve what the checker rejects.
    const passage = item.source_passage_id ? await store.getPassage(item.source_passage_id) : null;
    const check = checkItem(item, passage);
    if (!check.ok) return NextResponse.json({ error: "check_failed", problems: check.problems }, { status: 422 });
  }
  const updated = await store.setItemStatus(id, decision, reviewer);
  return NextResponse.json({ item: updated });
}
