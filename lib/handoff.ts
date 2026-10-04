import { z } from "zod";

import { findIdentifier } from "./identifiers";

export { findIdentifier };

export const HandoffBody = z.object({
  conceptId: z.string().max(64).nullable(),
  level: z.enum(["L3", "L4"]),
  questionHash: z.string().regex(/^[0-9a-f]{16}$/),
  summary: z.string().trim().min(10).max(800),
});
