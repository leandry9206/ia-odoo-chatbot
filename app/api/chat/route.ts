import { createGroq } from "@ai-sdk/groq";
import { streamText, type CoreMessage } from "ai";
import { retrieve } from "@/lib/retrieval";
import { buildSystemPrompt, type BotId } from "@/lib/prompt";
import { setRateLimit } from "@/lib/groq-rate-limit";
import { rateLimitSeconds } from "@/lib/groq-errors";
import { GROQ_MODEL } from "@/lib/groq-config";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, contexts, bot } = (await req.json()) as {
      messages: CoreMessage[];
      contexts?: string[];
      bot?: BotId;
    };

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const question =
      typeof lastUser?.content === "string" ? lastUser.content : "";

    if (!question) {
      return new Response("No se recibió ninguna pregunta.", { status: 400 });
    }

    let contextBlock = "";
    try {
      ({ contextBlock } = await retrieve(question, 5, contexts));
    } catch (retrieveErr) {
      console.error("Error en retrieve():", retrieveErr);
    }

    const result = streamText({
      model: groq(GROQ_MODEL),
      system: buildSystemPrompt(contextBlock, bot),
      messages,
      temperature: 0.5,
    });

    return result.toDataStreamResponse({
      getErrorMessage: (err) => {
        const secs = rateLimitSeconds(err);
        if (secs !== null) {
          setRateLimit(secs); // actualiza singleton para /api/status
          console.warn("Groq rate limit (TPD). Retry-after:", secs, "s");
          return `RATE_LIMIT:${secs}`;
        }
        console.error("Error en stream Groq:", err);
        return "Error generando la respuesta. Inténtalo de nuevo.";
      },
    });
  } catch (err) {
    const secs = rateLimitSeconds(err);
    if (secs !== null) {
      setRateLimit(secs); // actualiza singleton para /api/status
      console.warn("Groq rate limit (outer catch, TPD). Retry-after:", secs, "s");
      return new Response(`RATE_LIMIT:${secs}`, { status: 429 });
    }
    console.error("Error en /api/chat:", err);
    return new Response("Ocurrió un error procesando tu mensaje.", {
      status: 500,
    });
  }
}
