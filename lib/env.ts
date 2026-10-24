export const LLM_BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com";
export const LLM_API_KEY = process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || "";
export const LLM_MODEL = process.env.LLM_MODEL || "deepseek-chat";

export function hasApiKey(): boolean {
  return LLM_API_KEY.length > 0;
}
