import { Index } from "@upstash/vector";

export interface ChunkMetadata {
  text: string;
  url: string;
  title: string;
  source?: string;   // id de la fuente: 'mercurio', 'destino', ...
  context?: string;  // etiqueta legible para el prompt del modelo
  [key: string]: unknown;
}

let _index: Index<ChunkMetadata> | null = null;

export function getIndex(): Index<ChunkMetadata> {
  if (_index) return _index;
  const url = process.env.UPSTASH_VECTOR_REST_URL;
  const token = process.env.UPSTASH_VECTOR_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Faltan UPSTASH_VECTOR_REST_URL / UPSTASH_VECTOR_REST_TOKEN");
  }
  _index = new Index<ChunkMetadata>({ url, token });
  return _index;
}

export interface UpsertChunk {
  id: string;
  vector: number[];
  metadata: ChunkMetadata;
}

export async function upsertChunks(chunks: UpsertChunk[], batchSize = 100) {
  const index = getIndex();
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

export async function resetIndex() {
  const index = getIndex();
  await index.reset();
}

export interface Match {
  text: string;
  url: string;
  title: string;
  source?: string;
  context?: string;
  score: number;
}

// filter: expresión de metadata de Upstash, e.g. "source = 'destino'"
// Si no se pasa, se busca en todos los contextos.
export async function query(vector: number[], topK = 5, filter?: string): Promise<Match[]> {
  const index = getIndex();
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
  return results
    .filter((r) => r.metadata)
    .map((r) => ({
      text: r.metadata!.text,
      url: r.metadata!.url,
      title: r.metadata!.title,
      source: r.metadata!.source,
      context: r.metadata!.context,
      score: r.score,
    }));
}
