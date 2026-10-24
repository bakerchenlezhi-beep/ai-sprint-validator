export type SimEvent =
  | { type: "turn_start"; personaId: string; round: number }
  | { type: "token"; messageId: string; delta: string }
  | { type: "turn_end"; messageId: string }
  | { type: "round_end"; round: number }
  | { type: "error"; message: string; recoverable: boolean }
  | { type: "done" };
