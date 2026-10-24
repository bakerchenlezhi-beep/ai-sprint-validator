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

const level = z.enum(["low", "medium", "high"]);

export const pitchSchema = pitchInputSchema.extend({ id: z.string(), pricingNote: z.string().max(200).optional() });

/** What the LLM returns for each persona; id and avatarColor are assigned server-side. */
export const llmPersonasSchema = z.object({
  personas: z
    .array(
      z.object({
        name: z.string().min(1),
        archetype: z.string().min(1),
        age: z.number().int().optional(),
        occupation: z.string().min(1),
        goals: z.array(z.string()).min(1),
        frustrations: z.array(z.string()).min(1),
        budgetSensitivity: level,
        techSavviness: level,
        speakingStyle: z.string().min(1),
      }),
    )
    .length(3),
});

export const personaSchema = llmPersonasSchema.shape.personas.element.extend({ id: z.string(), avatarColor: z.string() });

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["persona", "user", "system"]),
  personaId: z.string().optional(),
  content: z.string().max(4000),
  round: z.number().int(),
  status: z.enum(["streaming", "complete", "error"]),
  createdAt: z.number(),
});

export const MAX_TRANSCRIPT_MESSAGES = 40;

const transcriptFields = {
  pitch: pitchSchema,
  personas: z.array(personaSchema).length(3),
  messages: z.array(chatMessageSchema).max(MAX_TRANSCRIPT_MESSAGES),
};

export const simulateRequestSchema = z.object({
  ...transcriptFields,
  mode: z.enum(["start", "respond"]),
  round: z.number().int().min(0),
});

export const reportRequestSchema = z.object(transcriptFields);

export const personasRequestSchema = z.object({ pitch: pitchSchema });

export const llmReportSchema = z.object({
  verdict: z.enum(["strong", "promising", "risky", "weak"]),
  overallScore: z.number().min(0).max(100),
  perPersona: z.array(
    z.object({
      personaId: z.string(),
      sentiment: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
      wouldPay: z.boolean(),
      keyQuote: z.string(),
    }),
  ),
  themes: z.array(z.object({ label: z.string(), type: z.enum(["strength", "concern"]), mentions: z.number() })),
  risks: z.array(z.string()),
  suggestedExperiments: z.array(z.string()),
  openQuestions: z.array(z.string()),
});
