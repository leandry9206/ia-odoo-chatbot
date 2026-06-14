// Recorre cada fuente configurada y guarda el texto limpio en data/pages-<id>.json
// Uso: npm run crawl                     → todas las fuentes
//      npm run crawl -- --source=destino → solo una fuente

import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { getSources, type Source } from "./sources.config";

try {
  const env = readFileSync(".env.local", "utf-8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) process.env[trimmed.slice(0, eq).trim()] ??= trimmed.slice(eq + 1).trim();
  }
} catch { /* file missing is fine */ }

const MAX_PAGES = 500;
const DELAY_MS  = 300;

interface Page {
  url: string;
  title: string;
  text: string;
  source: string;
  context: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const parser = new XMLParser();

// ── Sitemap crawler (Odoo / generic) ───────────────────────────────────────

async function collectUrls(sitemapUrl: string, seen = new Set<string>()): Promise<string[]> {
  const res = await fetch(sitemapUrl);
  if (!res.ok) { console.warn(`No se pudo leer ${sitemapUrl} (${res.status})`); return []; }
  const xml  = await res.text();
  const parsed = parser.parse(xml);

  if (parsed.sitemapindex?.sitemap) {
    const entries = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap : [parsed.sitemapindex.sitemap];
    const urls: string[] = [];
    for (const s of entries) {
      if (s.loc && !seen.has(s.loc)) { seen.add(s.loc); urls.push(...(await collectUrls(s.loc, seen))); }
    }
    return urls;
  }
  if (parsed.urlset?.url) {
    const entries = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
    return entries.map((u: { loc: string }) => u.loc).filter(Boolean);
  }
  return [];
}

function cleanHtml(html: string, type: Source["type"]): { title: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe").remove();
  if (type === "odoo") {
    $("nav, footer, header, .o_footer, #o_footer, .o_header, #o_header").remove();
  } else {
    $("nav, footer, header, .gh-head, .gh-foot, .site-header, .site-footer, .gh-subscribe, .subscribe-form").remove();
  }
  const title = $("title").first().text().trim() || $("h1").first().text().trim();
  const main  = $("main").length ? $("main") : $("article").length ? $("article") : $("body");
  return { title, text: main.text().replace(/\s+/g, " ").trim() };
}

async function crawlViaSitemap(source: Source): Promise<Page[]> {
  console.log(`[${source.id}] Crawleando via sitemap: ${source.siteUrl}`);
  let urls = await collectUrls(`${source.siteUrl}/sitemap.xml`);
  urls = [...new Set(urls)].slice(0, MAX_PAGES);
  console.log(`[${source.id}] ${urls.length} URLs encontradas.`);

  const pages: Page[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const { title, text } = cleanHtml(await res.text(), source.type);
      if (text.length > 200) {
        pages.push({ url, title, text, source: source.id, context: source.context });
        console.log(`  [${source.id}] [${i + 1}/${urls.length}] ${title || url}`);
      }
    } catch (e) {
      console.warn(`  [${source.id}] fallo en ${url}:`, (e as Error).message);
    }
    await sleep(DELAY_MS);
  }
  return pages;
}

// ── Ghost Content API crawler ───────────────────────────────────────────────

interface GhostPost {
  title: string;
  url: string;
  html: string | null;
  excerpt: string | null;
}

interface GhostResponse {
  posts?: GhostPost[];
  pages?: GhostPost[];
  meta: { pagination: { next: number | null; pages: number } };
}

function htmlToText(html: string): string {
  const $ = cheerio.load(html);
  $("script, style, noscript, iframe, figure.kg-bookmark-card").remove();
  return $.root().text().replace(/\s+/g, " ").trim();
}

async function fetchGhostEndpoint(
  baseUrl: string,
  apiKey: string,
  resource: "posts" | "pages"
): Promise<GhostPost[]> {
  const all: GhostPost[] = [];
  let page = 1;

  while (true) {
    const url = `${baseUrl}/ghost/api/content/${resource}/?key=${apiKey}&limit=15&page=${page}&formats=html&fields=title,url,html,excerpt`;
    const res = await fetch(url, {
      headers: { "Accept-Version": "v5.0" },
    });

    if (!res.ok) {
      console.warn(`[destino] Ghost API ${resource} p${page}: HTTP ${res.status}`);
      break;
    }

    const data = (await res.json()) as GhostResponse;
    const items = (data.posts ?? data.pages) ?? [];
    all.push(...items);
    console.log(`  [destino] Ghost API ${resource} página ${page}/${data.meta.pagination.pages} — ${items.length} elementos`);

    if (!data.meta.pagination.next) break;
    page++;
    await sleep(200);
  }

  return all;
}

async function crawlViaGhostApi(source: Source): Promise<Page[]> {
  const key = source.ghostApiKey!;
  console.log(`[${source.id}] Crawleando via Ghost Content API: ${source.siteUrl}`);

  const [posts, pages] = await Promise.all([
    fetchGhostEndpoint(source.siteUrl, key, "posts"),
    fetchGhostEndpoint(source.siteUrl, key, "pages"),
  ]);

  const all = [...posts, ...pages];
  const result: Page[] = [];

  for (const item of all) {
    const text = item.html ? htmlToText(item.html) : (item.excerpt ?? "");
    if (text.length > 100) {
      result.push({ url: item.url, title: item.title, text, source: source.id, context: source.context });
    }
  }

  console.log(`[${source.id}] ${result.length} páginas/posts obtenidos via API.`);
  return result;
}

// ── Orquestador ─────────────────────────────────────────────────────────────

async function crawlSource(source: Source): Promise<Page[]> {
  if (source.type === "ghost" && source.ghostApiKey) {
    // Estrategia híbrida para Ghost:
    // 1. Ghost Content API → posts y páginas del editor (texto limpio, sin bot-blocking)
    // 2. Sitemap scraping → páginas HTML custom del theme (no gestionadas desde el CMS)
    // 3. Deduplicamos por URL: la API tiene prioridad sobre el scraping
    const [apiPages, sitemapPages] = await Promise.all([
      crawlViaGhostApi(source),
      crawlViaSitemap(source),
    ]);
    const seen = new Set(apiPages.map((p) => p.url));
    const extra = sitemapPages.filter((p) => !seen.has(p.url));
    if (extra.length > 0) {
      console.log(`[${source.id}] +${extra.length} páginas custom del theme (sitemap) añadidas.`);
    }
    return [...apiPages, ...extra];
  }
  // Odoo y sitios genéricos: solo sitemap
  return crawlViaSitemap(source);
}

async function main() {
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1];
  const allSources = getSources();
  const targets = sourceArg ? allSources.filter((s) => s.id === sourceArg) : allSources;

  if (targets.length === 0) {
    throw new Error(
      sourceArg
        ? `Fuente "${sourceArg}" no encontrada. Disponibles: ${allSources.map(s => s.id).join(", ")}`
        : "No hay fuentes configuradas. Revisa .env.local"
    );
  }

  await mkdir("data", { recursive: true });

  for (const source of targets) {
    const pages = await crawlSource(source);
    const outFile = `data/pages-${source.id}.json`;
    await writeFile(outFile, JSON.stringify(pages, null, 2), "utf-8");
    console.log(`[${source.id}] ✓ ${pages.length} páginas guardadas en ${outFile}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
