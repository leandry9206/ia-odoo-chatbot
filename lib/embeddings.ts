// Genera embeddings con Google Gemini (free tier), vía el AI SDK.
// Modelo: gemini-embedding-001, recortado a 768 dimensiones.
// Ese número DEBE coincidir con las dimensiones de tu índice en Upstash.

import { google } from "@ai-sdk/google";
import { embed as aiEmbed, embedMany } from "ai";

export const EMBED_DIMS = 768;

type InputType = "document" | "query";

function model(inputType: InputType) {
  return google.textEmbeddingModel("gemini-embedding-001", {
    outputDimensionality: EMBED_DIMS,
    // RETRIEVAL_DOCUMENT al indexar, RETRIEVAL_QUERY al preguntar:
    // mejora notablemente la calidad de la búsqueda.
    taskType: inputType === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
  });
}

// Varios textos a la vez (al indexar la web)
export async function embed(
  texts: string[],
  inputType: InputType
): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: model(inputType),
    values: texts,
  });
  return embeddings;
}

// Un solo texto (la pregunta del usuario)
export async function embedOne(
  text: string,
  inputType: InputType
): Promise<number[]> {
  const { embedding } = await aiEmbed({ model: model(inputType), value: text });
  return embedding;
}
