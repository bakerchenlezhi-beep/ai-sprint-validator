import { failure, parseBody } from "@/lib/api";
import { generateReport } from "@/lib/generate";
import { reportRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await parseBody(req, reportRequestSchema);
  if ("error" in body) return body.error;
  const { pitch, personas, messages } = body.data;
  try {
    const { value, fellBack } = await generateReport(pitch, personas, messages, req.signal);
    return Response.json({ report: value, fallback: fellBack });
  } catch (err) {
    return failure(err);
  }
}
