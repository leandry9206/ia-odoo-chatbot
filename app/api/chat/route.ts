import { createGroq } from "@ai-sdk/groq";
import { streamText, type CoreMessage } from "ai";
import { retrieve } from "@/lib/retrieval";
import { buildSystemPrompt } from "@/lib/prompt";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, contexts } = (await req.json()) as {
      messages: CoreMessage[];
      contexts?: string[]; // ids de fuentes a consultar; undefined = todos
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
        console.error("Error en stream Gemini:", err);
        return "Error generando la respuesta. Inténtalo de nuevo.";
      },
    });
  } catch (err) {
    console.error("Error en /api/chat:", err);
    return new Response("Ocurrió un error procesando tu mensaje.", {
      status: 500,
    });
  }
}
