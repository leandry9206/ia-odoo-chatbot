import { embedOne } from "./embeddings";
import { query, type Match } from "./vectorStore";

const MIN_SCORE = 0.4;

export interface RetrievedContext {
  matches: Match[];
  contextBlock: string;
}

export async function retrieve(question: string, topK = 5): Promise<RetrievedContext> {
  const vector = await embedOne(question, "query");
  const all = await query(vector, topK);
  const matches = all.filter((m) => m.score >= MIN_SCORE);

  const contextBlock = matches
    .map((m, i) => {
      const contextLabel = m.context ? ` — Contexto: ${m.context}` : "";
      return `[Fuente ${i + 1}${contextLabel}] ${m.title} (${m.url})\n${m.text}`;
    })
    .join("\n\n---\n\n");

  return { matches, contextBlock };
}
