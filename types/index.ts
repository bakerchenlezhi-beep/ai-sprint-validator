export interface ProductPitch {
  id: string;
  title: string;
  description: string; // 20–2000 chars
  targetAudience?: string;
  stage?: "idea" | "prototype" | "launched";
  pricingNote?: string;
}

export interface Persona {
  id: string; // 'p1' | 'p2' | 'p3'
  name: string;
  archetype: string; // e.g. "Skeptical enterprise buyer"
  age?: number;
  occupation: string;
  goals: string[];
  frustrations: string[];
  budgetSensitivity: "low" | "medium" | "high";
  techSavviness: "low" | "medium" | "high";
  speakingStyle: string; // injected into system prompt
  avatarColor: string; // tailwind token for UI
}

export type MessageRole = "persona" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  personaId?: string; // set when role === 'persona'
  content: string;
  round: number; // 0 = opening; increments after P3
  status: "streaming" | "complete" | "error";
  createdAt: number;
}

export interface SimulationReport {
  verdict: "strong" | "promising" | "risky" | "weak";
  overallScore: number; // 0–100
  perPersona: {
    personaId: string;
    sentiment: -1 | 0 | 1;
    wouldPay: boolean;
    keyQuote: string;
  }[];
  themes: { label: string; type: "strength" | "concern"; mentions: number }[];
  risks: string[];
  suggestedExperiments: string[]; // sprint-sized validation tasks
  openQuestions: string[];
  generatedAt: number;
  source: "llm" | "mock";
}

export type SimStatus =
  | "idle"
  | "generatingPersonas"
  | "running"
  | "awaitingUser"
  | "reporting"
  | "done"
  | "error";
