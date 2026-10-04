// Fails the build if content integrity rules are broken. Usage: npx tsx scripts/check-content.ts
import { checkContent } from "../lib/content-check";

const problems = checkContent();
if (problems.length) {
  console.error("Content check failed:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Content check passed.");
