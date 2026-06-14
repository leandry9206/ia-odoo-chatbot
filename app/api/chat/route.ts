import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { retrieve } from "@/lib/retrieval";
import { buildSystemPrompt } from "@/lib/prompt";

// Se ejecuta en el runtime Node de Vercel.
export const runtime = "nodejs";
export const maxDuration = 30; // segundos

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: CoreMessage[] };

    // 1. Tomar la última pregunta del usuario
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const question =
      typeof lastUser?.content === "string" ? lastUser.content : "";

    if (!question) {
      return new Response("No se recibió ninguna pregunta.", { status: 400 });
    }

    // 2. Recuperar fragmentos relevantes de la base vectorial (RAG)
    const { contextBlock } = await retrieve(question, 5);

    // 3. Generar la respuesta con Gemini, anclada al contexto
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: buildSystemPrompt(contextBlock),
      messages,
      temperature: 0.2,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("Error en /api/chat:", err);
    return new Response("Ocurrió un error procesando tu mensaje.", {
      status: 500,
    });
  }
}
