import { createGroq } from "@ai-sdk/groq";
import { streamText, type CoreMessage } from "ai";
import { retrieve } from "@/lib/retrieval";
import { buildSystemPrompt } from "@/lib/prompt";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 30;

function rateLimitSeconds(err: unknown): number | null {
  const e = err as Record<string, unknown>;
  const status = (e?.statusCode ?? e?.status) as number | undefined;
  const msg    = String(e?.message ?? "").toLowerCase();
  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    const headers = e?.responseHeaders as Record<string, string> | undefined;
    const raw     = headers?.["retry-after"] ?? headers?.["x-ratelimit-reset-requests"];
    const parsed  = raw ? parseInt(String(raw), 10) : NaN;
    return isNaN(parsed) ? 60 : Math.max(10, parsed);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { messages, contexts } = (await req.json()) as {
      messages: CoreMessage[];
      contexts?: string[];
    };

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const question =
      typeof lastUser?.content === "string" ? lastUser.content : "";

    if (!question) {
      return new Response("No se recibió ninguna pregunta.", { status: 400 });
    }

    // Recuperar fragmentos — si falla (Upstash, embeddings) continuamos sin contexto
    let contextBlock = "";
    try {
      ({ contextBlock } = await retrieve(question, 5, contexts));
    } catch (retrieveErr) {
      console.error("Error en retrieve():", retrieveErr);
    }

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: buildSystemPrompt(contextBlock),
      messages,
      temperature: 0.2,
    });

    return result.toDataStreamResponse({
      getErrorMessage: (err) => {
        const secs = rateLimitSeconds(err);
        if (secs !== null) {
          console.warn("Groq rate limit. Retry-after:", secs, "s");
          return `RATE_LIMIT:${secs}`;
        }
        console.error("Error en stream Groq:", err);
        return "Error generando la respuesta. Inténtalo de nuevo.";
      },
    });
  } catch (err) {
    const secs = rateLimitSeconds(err);
    if (secs !== null) {
      console.warn("Groq rate limit (outer catch). Retry-after:", secs, "s");
      return new Response(`RATE_LIMIT:${secs}`, { status: 429 });
    }
    console.error("Error en /api/chat:", err);
    return new Response("Ocurrió un error procesando tu mensaje.", {
      status: 500,
    });
  }
}
