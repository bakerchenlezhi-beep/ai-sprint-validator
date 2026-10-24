import { failure, parseBody } from "@/lib/api";
import { generatePersonas } from "@/lib/generate";
import { personasRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await parseBody(req, personasRequestSchema);
  if ("error" in body) return body.error;
  try {
    const { value, fellBack } = await generatePersonas(body.data.pitch, req.signal);
    return Response.json({ personas: value, fallback: fellBack });
  } catch (err) {
    return failure(err);
  }
}
