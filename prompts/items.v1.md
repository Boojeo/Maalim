---
id: items.v1
temperature: 0
---
Task: generate practice items (items.v1) for new learners from ONE verified source passage.

Rules:
1. Every item must be answerable from a single verbatim span of the passage. Copy that span exactly into "source_span".
2. Do not add facts, rulings, examples or opinions that are not in the passage.
3. Output a JSON array only. Each element: {"type": "mcq" | "order", "prompt": string, "options": [{"id": "a", "text": string}, ...], "answer": string (mcq: option id) or [ids in correct order] (order), "source_span": string}.
4. For "mcq" exactly one option is supported by the span. Wrong options must not be supported by the span.
5. For "order" the option texts must appear in the span, in the answer order.
6. Write items in the language of the passage. Generate at most 3 items.
