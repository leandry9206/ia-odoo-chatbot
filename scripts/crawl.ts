// Recorre el sitemap de cada fuente configurada, descarga cada página y guarda el texto limpio.
// Uso: npm run crawl                    → todas las fuentes
//      npm run crawl -- --source=destino → solo una fuente
// Resultado: data/pages-<id>.json por cada fuente

import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { getSources, type Source } from "./sources.config";

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

const MAX_PAGES = 500;
const DELAY_MS = 300;

interface Page {
  url: string;
  title: string;
  text: string;
  source: string;
  context: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const parser = new XMLParser();

async function collectUrls(sitemapUrl: string, seen = new Set<string>()): Promise<string[]> {
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    console.warn(`No se pudo leer ${sitemapUrl} (${res.status})`);
    return [];
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);

  if (parsed.sitemapindex?.sitemap) {
    const entries = Array.isArray(parsed.sitemapindex.sitemap)
      ? parsed.sitemapindex.sitemap
      : [parsed.sitemapindex.sitemap];
    const urls: string[] = [];
    for (const s of entries) {
      if (s.loc && !seen.has(s.loc)) {
        seen.add(s.loc);
        urls.push(...(await collectUrls(s.loc, seen)));
      }
    }
    return urls;
  }

  if (parsed.urlset?.url) {
    const entries = Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url];
    return entries.map((u: { loc: string }) => u.loc).filter(Boolean);
  }

  return [];
}

function cleanPage(html: string, type: Source["type"]): { title: string; text: string } {
  const $ = cheerio.load(html);

  // Selectores comunes
  $("script, style, noscript, iframe").remove();

  if (type === "odoo") {
    $("nav, footer, header, .o_footer, #o_footer, .o_header, #o_header").remove();
  } else if (type === "ghost") {
    // Ghost CMS: cabecera y pie tienen clases propias
    $("nav, footer, header, .gh-head, .gh-foot, .gh-navigation, .site-header, .site-footer").remove();
    // Quitar widgets de suscripción y membership
    $(".gh-subscribe, .subscribe-form, .kg-bookmark-card, .gh-portal").remove();
  } else {
    $("nav, footer, header").remove();
  }

  const title = $("title").first().text().trim() || $("h1").first().text().trim();

  // Para Ghost: preferir el contenido del artículo
  let main = $("main");
  if (!main.length) main = $("article");
  if (!main.length) main = $("body");

  const text = main.text().replace(/\s+/g, " ").trim();
  return { title, text };
}

async function crawlSource(source: Source): Promise<Page[]> {
  console.log(`\n[${source.id}] Crawleando ${source.siteUrl} (tipo: ${source.type}) ...`);
  let urls = await collectUrls(`${source.siteUrl}/sitemap.xml`);
  urls = [...new Set(urls)].slice(0, MAX_PAGES);
  console.log(`[${source.id}] Encontradas ${urls.length} URLs.`);

  const pages: Page[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const html = await res.text();
      const { title, text } = cleanPage(html, source.type);
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

async function main() {
  // Soporte para --source=<id> para crawlear solo una fuente
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))?.split("=")[1];

  const allSources = getSources();
  const targets = sourceArg
    ? allSources.filter((s) => s.id === sourceArg)
    : allSources;

  if (targets.length === 0) {
    throw new Error(
      sourceArg
        ? `No se encontró la fuente "${sourceArg}". Disponibles: ${allSources.map(s => s.id).join(", ")}`
        : "No hay fuentes configuradas. Revisa .env.local"
    );
  }

  await mkdir("data", { recursive: true });

  for (const source of targets) {
    const pages = await crawlSource(source);
    const outFile = `data/pages-${source.id}.json`;
    await writeFile(outFile, JSON.stringify(pages, null, 2), "utf-8");
    console.log(`[${source.id}] Guardadas ${pages.length} páginas en ${outFile}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
