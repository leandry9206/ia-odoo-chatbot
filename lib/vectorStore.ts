import { Index } from "@upstash/vector";

// Metadatos que guardamos junto a cada fragmento, para citar la fuente.
export interface ChunkMetadata {
  text: string;
  url: string;
  title: string;
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

// Sube fragmentos en lotes (Upstash acepta arrays grandes, pero troceamos por seguridad).
export async function upsertChunks(chunks: UpsertChunk[], batchSize = 100) {
  const index = getIndex();
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    await index.upsert(batch);
  }
}

// Vacía el índice antes de un re-indexado completo (opcional).
export async function resetIndex() {
  const index = getIndex();
  await index.reset();
}

export interface Match {
  text: string;
  url: string;
  title: string;
  score: number;
}

export async function query(vector: number[], topK = 5): Promise<Match[]> {
  const index = getIndex();
  const results = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });
  return results
    .filter((r) => r.metadata)
    .map((r) => ({
      text: r.metadata!.text,
      url: r.metadata!.url,
      title: r.metadata!.title,
      score: r.score,
    }));
}
