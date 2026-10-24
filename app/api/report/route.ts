import { failure, parseBody } from "@/lib/api";
import { generateReport } from "@/lib/generate";
import { reportRequestSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await parseBody(req, reportRequestSchema);
  if ("error" in body) return body.error;
  const { pitch, personas, messages } = body.data;
  try {
    return Response.json({ report: await generateReport(pitch, personas, messages, req.signal) });
  } catch (err) {
    return failure(err);
  }
}
