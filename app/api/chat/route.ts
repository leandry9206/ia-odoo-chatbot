import { google } from "@ai-sdk/google";
import { streamText, type CoreMessage } from "ai";
import { retrieve } from "@/lib/retrieval";
import { buildSystemPrompt } from "@/lib/prompt";

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

    // Recuperar fragmentos del contexto solicitado (o de todos si no se especifica)
    const { contextBlock } = await retrieve(question, 5, contexts);

    const result = streamText({
      model: google("gemini-1.5-flash"),
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
