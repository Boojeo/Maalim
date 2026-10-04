// Detects obvious personal identifiers (rule 6: no user identifiers). Used by the client to warn
// before sending and by /api/handoff, which refuses them regardless of the client.
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE = /(?:\+?\d[\s().-]*){7,}/;
const URL_RE = /https?:\/\/|www\./i;

export function findIdentifier(text: string): "email" | "phone" | "url" | null {
  if (EMAIL.test(text)) return "email";
  if (PHONE.test(text)) return "phone";
  if (URL_RE.test(text)) return "url";
  return null;
}
