# Chatbot RAG para web Odoo (versión gratuita con Gemini)

Asistente que **aprende del contenido público de tu web Odoo** y responde preguntas
usando **Google Gemini** (free tier). No toca tu base de datos de Odoo: solo lee tu
sitio vía sitemap. Desplegable **online en Vercel** desde **GitHub**, sin pagar nada.

## Cómo funciona

```
Odoo (web pública)
   │  scripts/crawl.ts  → lee /sitemap.xml y limpia el HTML
   ▼  data/pages.json
   │  scripts/ingest.ts → trocea, genera embeddings (Gemini) y sube a Upstash
   ▼
Upstash Vector  ◄── base vectorial (búsqueda por similitud)
   ▲
   │  /api/chat → recupera fragmentos + pregunta a Gemini (streaming)
   ▼
Next.js en Vercel  →  ChatWidget (flotante)
```

El **crawleo/indexado** corre aparte (en tu máquina o por GitHub Actions), nunca dentro
de Vercel. La app desplegada solo hace la parte rápida: recuperar + responder.

## Stack (todo en free tier)

- **Next.js 15** (App Router, TypeScript)
- **Google Gemini** vía `@ai-sdk/google`
  - Chat: `gemini-2.5-flash`
  - Embeddings: `gemini-embedding-001` (recortado a 768 dimensiones)
- **Upstash Vector** como base vectorial serverless
- **Vercel** para el hosting
- **GitHub Actions** para re-indexar en cron

## 1. Requisitos: 2 cuentas gratis (sin tarjeta)

1. **Google AI Studio** → https://aistudio.google.com/apikey → *Create API key*.
   Esta única key sirve para el chat y para los embeddings.
2. **Upstash** → https://console.upstash.com → *Vector* → *Create Index* con:
   - **Dimensions: 768**
   - **Metric: COSINE**
   - copia la *REST URL* y el *REST TOKEN*.

> Límites del free tier de Gemini: ~10 peticiones/min y ~1.500/día en gemini-2.5-flash.
> De sobra para uso personal. Los embeddings tienen su propia cuota diaria, así que
> re-indexa solo cuando cambie tu web (no en cada arranque).

## 2. Instalación local

```bash
npm install
cp .env.example .env.local   # rellena GOOGLE_GENERATIVE_AI_API_KEY, Upstash y ODOO_SITE_URL
```

## 3. Indexar tu web (una vez)

```bash
npm run crawl    # descarga y limpia las páginas → data/pages.json
npm run ingest   # embeddings + subida a Upstash
```

## 4. Probar en local

```bash
npm run dev      # http://localhost:3000
```

## 5. Ponerlo ONLINE en Vercel (gratis)

1. Sube el proyecto a un repo de **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Chatbot RAG Odoo con Gemini"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/odoo-chatbot.git
   git push -u origin main
   ```
2. En **Vercel** → *Add New Project* → importa el repo (detecta Next.js solo).
3. En *Settings → Environment Variables* añade:
   `GOOGLE_GENERATIVE_AI_API_KEY`, `UPSTASH_VECTOR_REST_URL`, `UPSTASH_VECTOR_REST_TOKEN`.
4. *Deploy*. Tendrás una URL pública (`https://tu-proyecto.vercel.app`) para probar
   el chatbot desde cualquier dispositivo. Cada `git push` redespliega.

## 6. Re-indexar automáticamente (GitHub Actions)

En tu repo → *Settings → Secrets and variables → Actions*, añade los secretos:
`ODOO_SITE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `UPSTASH_VECTOR_REST_URL`,
`UPSTASH_VECTOR_REST_TOKEN`.

El workflow `.github/workflows/reindex.yml` re-indexa cada noche (3:00 UTC) y a mano
desde la pestaña *Actions → Run workflow*. **Córrelo una vez al inicio** para el
indexado inicial (o hazlo en local con `npm run ingest`).

## Ajustes útiles

| Qué cambiar | Dónde |
|---|---|
| Tono y reglas del bot | `lib/prompt.ts` |
| Nº de fragmentos / umbral de relevancia | `lib/retrieval.ts` (`topK`, `MIN_SCORE`) |
| Tamaño de los fragmentos | `scripts/ingest.ts` (`CHUNK_WORDS`, `OVERLAP_WORDS`) |
| Modelo de chat de Gemini | `app/api/chat/route.ts` |
| Modelo/dimensiones de embeddings | `lib/embeddings.ts` (`EMBED_DIMS`) |
| Colores y diseño del widget | `app/globals.css` |

> Si cambias `EMBED_DIMS`, recrea el índice de Upstash con las mismas dimensiones
> y vuelve a indexar.

## ¿Y si algún día quieres más calidad?

La arquitectura es la misma para cualquier modelo. Para volver a Claude, instala
`@ai-sdk/anthropic`, pon `ANTHROPIC_API_KEY` y cambia el modelo en
`app/api/chat/route.ts`. Nada más se toca.
