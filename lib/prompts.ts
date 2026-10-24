import type { ChatMessage, Persona, ProductPitch } from "@/types";

function describePitch(pitch: ProductPitch): string {
  return [
    `Product: ${pitch.title}`,
    `Description: ${pitch.description}`,
    pitch.targetAudience && `Target audience: ${pitch.targetAudience}`,
    pitch.stage && `Stage: ${pitch.stage}`,
    pitch.pricingNote && `Pricing: ${pitch.pricingNote}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function speakerName(m: ChatMessage, personas: Persona[]): string {
  if (m.role === "user") return "Founder";
  return personas.find((p) => p.id === m.personaId)?.name ?? "Participant";
}

export function formatTranscript(messages: ChatMessage[], personas: Persona[]): string {
  return messages
    .filter((m) => m.content.trim())
    .map((m) => `${speakerName(m, personas)}: ${m.content.trim()}`)
    .join("\n\n");
}

export function buildPersonasPrompt(pitch: ProductPitch) {
  return {
    system: `You design realistic synthetic users for validating a product idea. Reply with a JSON object only:
{"personas":[{"name","archetype","age","occupation","goals":[2-3 strings],"frustrations":[2-3 strings],"budgetSensitivity":"low"|"medium"|"high","techSavviness":"low"|"medium"|"high","speakingStyle"}]}
Create exactly 3 personas who would see this product differently (e.g. a skeptic, an enthusiast, a price-sensitive user), specific to the pitch's audience and domain. Give them distinct voices in speakingStyle.`,
    messages: [{ role: "user" as const, content: describePitch(pitch) }],
  };
}

export function buildTurnPrompt(opts: {
  pitch: ProductPitch;
  persona: Persona;
  personas: Persona[];
  transcript: ChatMessage[];
  respondingToUser: boolean;
}) {
  const { pitch, persona, personas, transcript, respondingToUser } = opts;
  const system = `You are ${persona.name}, ${persona.archetype} (${persona.occupation}${persona.age ? `, ${persona.age}` : ""}) in a product feedback panel.
Goals: ${persona.goals.join("; ")}.
Frustrations: ${persona.frustrations.join("; ")}.
Budget sensitivity: ${persona.budgetSensitivity}. Tech savviness: ${persona.techSavviness}.
Speaking style: ${persona.speakingStyle}

Rules: stay in character, speak in first person, at most 80 words. React to what the others said by name, and disagree where your profile would. Do not repeat points already made. No preamble, no stage directions.${
    respondingToUser ? " The founder just spoke: answer their latest message directly." : ""
  }`;
  const history = formatTranscript(transcript, personas);
  const content = `${describePitch(pitch)}\n\nConversation so far:\n${history || "(you speak first)"}\n\nYour turn, ${persona.name}.`;
  return { system, messages: [{ role: "user" as const, content }] };
}

export function buildReportPrompt(pitch: ProductPitch, personas: Persona[], transcript: ChatMessage[]) {
  return {
    system: `You analyse a synthetic user panel's discussion of a product idea. Reply with a JSON object only:
{"verdict":"strong"|"promising"|"risky"|"weak","overallScore":0-100,"perPersona":[{"personaId","sentiment":-1|0|1,"wouldPay":boolean,"keyQuote":"short verbatim quote"}],"themes":[{"label","type":"strength"|"concern","mentions":number}],"risks":[strings],"suggestedExperiments":[sprint-sized validation tasks, strings],"openQuestions":[strings]}
Include one perPersona entry for each persona id listed. Base everything on the discussion.`,
    messages: [
      {
        role: "user" as const,
        content: `${describePitch(pitch)}\n\nPersonas:\n${personas.map((p) => `${p.id}: ${p.name}, ${p.archetype}`).join("\n")}\n\nDiscussion:\n${formatTranscript(transcript, personas)}`,
      },
    ],
  };
}
