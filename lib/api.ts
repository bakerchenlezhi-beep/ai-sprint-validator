import type { z } from "zod";

/** Parses a JSON request body against a schema; returns the data or a ready 400 response. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<{ data: z.infer<T> } | { error: Response }> {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (parsed.success) return { data: parsed.data };
  return { error: Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 }) };
}

export function failure(err: unknown): Response {
  return Response.json({ error: err instanceof Error ? err.message : "Request failed" }, { status: 500 });
}
