import { z } from "zod";

// Public instructions, never an authorization or training override.
const steps = z.array(z.string().trim().min(1).max(500)).max(20).default([]);
export const resourceUsageGuideSchema = z.object({
  beforeUse: steps,
  steps,
  afterUse: steps,
  safetyNotes: z.string().trim().max(2000).default("")
}).strict();

export const resourceSpecsSchema = z.record(z.unknown()).superRefine((specs, ctx) => {
  if (specs.usageGuide === undefined) return;
  const result = resourceUsageGuideSchema.safeParse(specs.usageGuide);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({ ...issue, path: ["usageGuide", ...issue.path] });
    }
  }
});
