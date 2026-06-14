// Recorre el sitemap de tu web Odoo, descarga cada página y guarda el texto limpio.
// Uso: npm run crawl   (lee ODOO_SITE_URL del entorno)
// Resultado: data/pages.json

import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";

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

const SITE = process.env.ODOO_SITE_URL?.replace(/\/$/, "");
if (!SITE) throw new Error("Falta ODOO_SITE_URL");

const MAX_PAGES = 500; // tope de seguridad
const DELAY_MS = 300; // pausa entre peticiones para no saturar tu servidor

interface Page {
  url: string;
  title: string;
  text: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const parser = new XMLParser();

// Resuelve un sitemap, soportando índices de sitemaps anidados.
async function collectUrls(sitemapUrl: string, seen = new Set<string>()): Promise<string[]> {
  const res = await fetch(sitemapUrl);
  if (!res.ok) {
    console.warn(`No se pudo leer ${sitemapUrl} (${res.status})`);
    return [];
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);

  // Índice de sitemaps
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

  // Sitemap normal
  if (parsed.urlset?.url) {
    const entries = Array.isArray(parsed.urlset.url)
      ? parsed.urlset.url
      : [parsed.urlset.url];
    return entries.map((u: { loc: string }) => u.loc).filter(Boolean);
  }

  return [];
}

function cleanPage(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  // Quitar ruido que no aporta a las respuestas
  $("script, style, nav, footer, header, noscript, iframe, .o_footer, #o_footer").remove();
  const title = $("title").first().text().trim() || $("h1").first().text().trim();
  const main = $("main").length ? $("main") : $("body");
  const text = main
    .text()
    .replace(/\s+/g, " ")
    .trim();
  return { title, text };
}

async function main() {
  console.log(`Crawleando ${SITE} ...`);
  let urls = await collectUrls(`${SITE}/sitemap.xml`);
  urls = [...new Set(urls)].slice(0, MAX_PAGES);
  console.log(`Encontradas ${urls.length} URLs.`);

  const pages: Page[] = [];
  for (const [i, url] of urls.entries()) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const html = await res.text();
      const { title, text } = cleanPage(html);
      if (text.length > 200) {
        pages.push({ url, title, text });
        console.log(`  [${i + 1}/${urls.length}] ${title || url}`);
      }
    } catch (e) {
      console.warn(`  fallo en ${url}:`, (e as Error).message);
    }
    await sleep(DELAY_MS);
  }

  await mkdir("data", { recursive: true });
  await writeFile("data/pages.json", JSON.stringify(pages, null, 2), "utf-8");
  console.log(`Guardadas ${pages.length} páginas en data/pages.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
