import { embedOne } from "./embeddings";
import { query, type Match } from "./vectorStore";

const MIN_SCORE = 0.4;

export interface RetrievedContext {
  matches: Match[];
  contextBlock: string;
}

// Construye el filtro de metadata para Upstash Vector.
// Ejemplos: ["destino"] → "source = 'destino'"
//           ["mercurio","destino"] → "source IN ('mercurio','destino')"
//           undefined / [] → sin filtro (todos los contextos)
function buildSourceFilter(contexts?: string[]): string | undefined {
  if (!contexts || contexts.length === 0) return undefined;
  if (contexts.length === 1) return `source = '${contexts[0]}'`;
  return `source IN (${contexts.map((c) => `'${c}'`).join(", ")})`;
}

export async function retrieve(
  question: string,
  topK = 5,
  contexts?: string[]
): Promise<RetrievedContext> {
  const vector = await embedOne(question, "query");
  const filter = buildSourceFilter(contexts);
  const all = await query(vector, topK, filter);
  const matches = all.filter((m) => m.score >= MIN_SCORE);

  const contextBlock = matches
    .map((m, i) => {
      const contextLabel = m.context ? ` — Contexto: ${m.context}` : "";
      return `[Fuente ${i + 1}${contextLabel}] ${m.title} (${m.url})\n${m.text}`;
    })
    .join("\n\n---\n\n");

  return { matches, contextBlock };
}
