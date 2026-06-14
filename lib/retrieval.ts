import { embedOne } from "./embeddings";
import { query, type Match } from "./vectorStore";

const MIN_SCORE = 0.4; // descarta fragmentos poco relevantes

export interface RetrievedContext {
  matches: Match[];
  contextBlock: string; // texto listo para inyectar en el prompt del modelo
}

export async function retrieve(question: string, topK = 5): Promise<RetrievedContext> {
  const vector = await embedOne(question, "query");
  const all = await query(vector, topK);
  const matches = all.filter((m) => m.score >= MIN_SCORE);

  const contextBlock = matches
    .map(
      (m, i) =>
        `[Fuente ${i + 1}] ${m.title} (${m.url})\n${m.text}`
    )
    .join("\n\n---\n\n");

  return { matches, contextBlock };
}
