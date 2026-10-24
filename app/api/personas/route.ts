import { failure, parseBody } from "@/lib/api";
import { generatePersonas } from "@/lib/generate";
import { personasRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await parseBody(req, personasRequestSchema);
  if ("error" in body) return body.error;
  try {
    return Response.json({ personas: await generatePersonas(body.data.pitch, req.signal) });
  } catch (err) {
    return failure(err);
  }
}
