import { z } from "zod";

export const pitchInputSchema = z.object({
  title: z.string().trim().min(1, "Give your product a name").max(80, "Keep the name under 80 characters"),
  description: z
    .string()
    .trim()
    .min(20, "Describe the idea in at least 20 characters")
    .max(2000, "Keep the pitch under 2000 characters"),
  targetAudience: z.string().trim().max(200, "Keep this under 200 characters").optional(),
  stage: z.enum(["idea", "prototype", "launched"]).optional(),
});

export type PitchInput = z.infer<typeof pitchInputSchema>;
