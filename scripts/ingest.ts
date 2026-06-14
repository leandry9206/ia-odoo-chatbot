// Parte el texto en fragmentos, genera embeddings con Gemini y los sube a Upstash.
// Uso: npm run ingest   (requiere data/pages.json del paso anterior)

import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { embed } from "../lib/embeddings";
import { upsertChunks, resetIndex, type UpsertChunk } from "../lib/vectorStore";

// Load .env.local (not loaded automatically outside Next.js)
try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
  }
} catch { /* file missing is fine */ }

const CHUNK_WORDS = 350; // tamaño de cada fragmento
const OVERLAP_WORDS = 60; // solapamiento para no cortar ideas a la mitad
const EMBED_BATCH = 20; // textos por lote (free tier: 100 req/min)
const BATCH_DELAY_MS = 30_000; // pausa entre lotes (~2 lotes/min = 40 req/min)
const RATE_LIMIT_WAIT_MS = 65_000; // espera al recibir 429 para resetear la ventana

interface Page {
  url: string;
  title: string;
  text: string;
}

function chunkText(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += CHUNK_WORDS - OVERLAP_WORDS) {
    const slice = words.slice(i, i + CHUNK_WORDS).join(" ");
    if (slice.trim().length > 0) chunks.push(slice);
    if (i + CHUNK_WORDS >= words.length) break;
  }
  return chunks;
}

async function main() {
  const raw = await readFile("data/pages.json", "utf-8");
  const pages = JSON.parse(raw) as Page[];
  console.log(`Leídas ${pages.length} páginas.`);

  // Vaciar el índice para un re-indexado limpio
  console.log("Vaciando el índice...");
  await resetIndex();

  // 1. Construir todos los fragmentos con su metadata
  type Pending = { id: string; text: string; url: string; title: string };
  const pending: Pending[] = [];
  pages.forEach((page, p) => {
    chunkText(page.text).forEach((chunk, c) => {
      pending.push({
        id: `p${p}-c${c}`,
        text: chunk,
        url: page.url,
        title: page.title,
      });
    });
  });
  console.log(`Total de fragmentos: ${pending.length}`);

  // 2. Embeber y subir por lotes
  const totalBatches = Math.ceil(pending.length / EMBED_BATCH);
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batchNum = Math.floor(i / EMBED_BATCH) + 1;
    const batch = pending.slice(i, i + EMBED_BATCH);
    let vectors: number[][];
    while (true) {
      try {
        vectors = await embed(batch.map((b) => b.text), "document");
        break;
      } catch (e: any) {
        const is429 = e?.lastError?.statusCode === 429 || e?.errors?.[0]?.statusCode === 429;
        if (!is429) throw e;
        process.stdout.write(`  Rate limit (429), esperando ${RATE_LIMIT_WAIT_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RATE_LIMIT_WAIT_MS));
        process.stdout.write(" reintentando.\n");
      }
    }
    const toUpsert: UpsertChunk[] = batch.map((b, j) => ({
      id: b.id,
      vector: vectors[j],
      metadata: { text: b.text, url: b.url, title: b.title },
    }));
    await upsertChunks(toUpsert);
    console.log(`  Lote ${batchNum}/${totalBatches} — subidos ${Math.min(i + EMBED_BATCH, pending.length)}/${pending.length}`);
    if (i + EMBED_BATCH < pending.length) {
      process.stdout.write(`  Esperando ${BATCH_DELAY_MS / 1000}s (límite API)...`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      process.stdout.write(" listo.\n");
    }
  }

  console.log("Indexado completo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
