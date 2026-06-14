// Parte el texto en fragmentos, genera embeddings con Gemini y los sube a Upstash.
// Uso: npm run ingest                    → indexa todos los data/pages-*.json
//      npm run ingest -- --source=destino → solo una fuente (sin reset del índice)

import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { embed } from "../lib/embeddings";
import { upsertChunks, resetIndex, type UpsertChunk } from "../lib/vectorStore";

// Load .env.local
try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
  }
} catch { /* file missing is fine */ }

const CHUNK_WORDS = 350;
const OVERLAP_WORDS = 60;
const EMBED_BATCH = 20;
const BATCH_DELAY_MS = 30_000;
const RATE_LIMIT_WAIT_MS = 65_000;

interface Page {
  url: string;
  title: string;
  text: string;
  source: string;
  context: string;
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

async function loadPagesFiles(sourceFilter?: string): Promise<Page[]> {
  const files = await readdir("data");
  const pageFiles = files.filter((f) => {
    if (!f.startsWith("pages-") || !f.endsWith(".json")) return false;
    if (sourceFilter) return f === `pages-${sourceFilter}.json`;
    return true;
  });

  if (pageFiles.length === 0) {
    const hint = sourceFilter
      ? `data/pages-${sourceFilter}.json`
      : "data/pages-<fuente>.json";
    throw new Error(`No se encontraron archivos de páginas. Ejecuta primero: npm run crawl. Esperaba: ${hint}`);
  }

  const allPages: Page[] = [];
  for (const file of pageFiles) {
    const raw = await readFile(`data/${file}`, "utf-8");
    const pages = JSON.parse(raw) as Page[];
    // Compatibilidad con formato antiguo (sin source/context)
    const sourceId = file.replace("pages-", "").replace(".json", "");
    for (const p of pages) {
      if (!p.source) p.source = sourceId;
      if (!p.context) p.context = sourceId;
    }
    allPages.push(...pages);
    console.log(`Leído ${file}: ${pages.length} páginas (contexto: ${pages[0]?.context ?? sourceId})`);
  }
  return allPages;
}

async function main() {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1];

  const pages = await loadPagesFiles(sourceArg);
  console.log(`Total páginas a indexar: ${pages.length}`);

  // Con --source solo se re-indexa una fuente; sin él, reset completo
  if (!sourceArg) {
    console.log("Vaciando el índice completo...");
    await resetIndex();
  } else {
    console.log(`Re-indexando solo la fuente "${sourceArg}" (sin reset global).`);
  }

  type Pending = {
    id: string;
    text: string;
    url: string;
    title: string;
    source: string;
    context: string;
  };

  const pending: Pending[] = [];
  pages.forEach((page, p) => {
    chunkText(page.text).forEach((chunk, c) => {
      pending.push({
        id: `${page.source}-p${p}-c${c}`,
        text: chunk,
        url: page.url,
        title: page.title,
        source: page.source,
        context: page.context,
      });
    });
  });
  console.log(`Total de fragmentos: ${pending.length}`);

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
      metadata: {
        text: b.text,
        url: b.url,
        title: b.title,
        source: b.source,
        context: b.context,
      },
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
