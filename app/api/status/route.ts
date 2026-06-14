import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 10;

function parseGroqRetryTime(msg: string): number | null {
  const match = msg.match(/try again in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (!match) return null;
  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = parseFloat(match[2]);
  return Math.ceil(minutes * 60 + seconds);
}

export async function GET() {
  const noCache = { headers: { "Cache-Control": "no-store, max-age=0" } };
  try {
    await generateText({
      model: groq("llama-3.3-70b-versatile"),
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 1,
    });
    return Response.json({ available: true }, noCache);
  } catch (err) {
    const e = err as Record<string, unknown>;
    const status = (e?.statusCode ?? e?.status) as number | undefined;
    const msg = String(e?.message ?? "");
    if (
      status === 429 ||
      msg.toLowerCase().includes("rate_limit_exceeded") ||
      msg.toLowerCase().includes("rate limit")
    ) {
      const retryAfter = parseGroqRetryTime(msg) ?? 60;
      return Response.json({ available: false, retryAfter }, noCache);
    }
    // Network / auth errors → don't block the user
    return Response.json({ available: true }, noCache);
  }
}
