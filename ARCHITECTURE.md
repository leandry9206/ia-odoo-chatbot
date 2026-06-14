# Arquitectura del proyecto — ia-odoo-chatbot

Chatbot RAG (Retrieval-Augmented Generation) que indexa múltiples webs y responde con Gemini.
Stack: Next.js 15 · Gemini 2.5 Flash · Upstash Vector · Vercel.

---

## Flujo de datos

```
[Webs externas]
      │ sitemap.xml
      ▼
scripts/crawl.ts          → data/pages-<id>.json   (texto limpio por fuente)
      │
      ▼
scripts/ingest.ts         → Upstash Vector Index    (embeddings + metadata)
      │
      ▼
lib/vectorStore.ts        → query()                 (búsqueda vectorial)
lib/retrieval.ts          → retrieve()              (embed pregunta → top-K chunks)
lib/prompt.ts             → buildSystemPrompt()     (inyecta contexto en el prompt)
      │
      ▼
app/api/chat/route.ts     → POST /api/chat          (stream de respuesta con Gemini)
      │
      ▼
components/ChatWidget.tsx → UI del chat             (widget embebible, 4 idiomas)
      │
      ▼
app/embed/page.tsx        → /embed                  (página mínima para iframe externo)
components/HomeLanding.tsx→ /                       (landing: dos iframes side-by-side, 4 idiomas)
```

---

## Archivos clave

| Archivo | Rol |
|---|---|
| `scripts/sources.config.ts` | **Define todas las fuentes**: id, URL, tipo (odoo/ghost), etiqueta de contexto |
| `scripts/crawl.ts` | Crawlea sitemap(s), limpia HTML según tipo de CMS, guarda `data/pages-<id>.json` |
| `scripts/ingest.ts` | Lee `data/pages-*.json`, trocea texto, genera embeddings, sube a Upstash con metadata |
| `lib/vectorStore.ts` | Wrapper de Upstash Vector: `upsertChunks`, `query`, `resetIndex`. Tipos: `ChunkMetadata`, `Match` |
| `lib/embeddings.ts` | `embed()` y `embedOne()` con Gemini `text-embedding-004` |
| `lib/retrieval.ts` | `retrieve(question)` → embed → query → filtra por score → devuelve `contextBlock` |
| `lib/prompt.ts` | `buildSystemPrompt(context)` → instrucciones + contexto RAG para el modelo |
| `app/api/chat/route.ts` | Endpoint POST: recibe mensajes, llama `retrieve`, llama Gemini, stream de respuesta |
| `app/page.tsx` | Punto de entrada raíz — renderiza `<HomeLanding />` |
| `components/HomeLanding.tsx` | **Landing page** (client): dos chatbots en iframes, selector de idioma para el home (FR/ES/EN/DE) |
| `app/embed/page.tsx` | Página de embed mínima: lee `?contexts` y `?theme`, pasa props al widget |
| `components/ChatWidget.tsx` | Widget React del chat: combobox de idioma (FR/ES/EN/DE), temas odoo y destino |
| `app/globals.css` | Estilos globales: tokens CSS, widget (`.panel`, `.lang-*`), temas, landing (`.l-*`) |
| `.github/workflows/reindex.yml` | Re-indexado nocturno (todas las fuentes) o manual por fuente |

---

## Metadatos en Upstash Vector

Cada fragmento almacena:
```ts
{
  text: string,     // texto del chunk (~350 palabras)
  url: string,      // URL de origen
  title: string,    // título de la página
  source: string,   // id de la fuente: 'mercurio' | 'destino'
  context: string,  // etiqueta legible: 'Mercurio' | 'metodología del receptivo y experiencias'
}
```
Los IDs de los chunks tienen formato `<source>-p<pageIdx>-c<chunkIdx>`.

---

## Fuentes configuradas

| id | Contexto en el prompt | URL | CMS |
|---|---|---|---|
| `mercurio` | `Mercurio` | `ODOO_SITE_URL` (.env) | Odoo |
| `destino` | `metodología del receptivo y experiencias` | `DESTINO_SITE_URL` (.env) | Ghost |

Para **añadir una nueva fuente**: editar `scripts/sources.config.ts` → añadir entrada al array → correr `npm run reindex`.

---

## Variables de entorno (`.env.local`)

```
GOOGLE_GENERATIVE_AI_API_KEY=   # Gemini (chat + embeddings)
UPSTASH_VECTOR_REST_URL=        # Upstash Vector endpoint (768 dims, COSINE)
UPSTASH_VECTOR_REST_TOKEN=      # Upstash Vector token
ODOO_SITE_URL=                  # URL base de Mercurio (Odoo)
DESTINO_SITE_URL=               # URL base de Destino (Ghost), default: https://destino-world.fr
```

---

## Scripts npm

```bash
npm run reindex              # Crawlea TODAS las fuentes + re-indexa (reset completo)
npm run reindex:mercurio     # Solo Mercurio
npm run reindex:destino      # Solo Destino
npm run crawl                # Solo paso de crawling (todas las fuentes)
npm run ingest               # Solo paso de ingesta (todas las fuentes)
npm run dev                  # Servidor Next.js de desarrollo
```

---

## Índice vectorial

- Proveedor: Upstash Vector (serverless)
- Dimensiones: 768 (Gemini `text-embedding-004` truncado)
- Métrica: COSINE
- Score mínimo de relevancia: 0.4 (en `lib/retrieval.ts`)
- Top-K por consulta: 5

---

## Soporte multiidioma

Ambas interfaces — la landing y el widget de chat — soportan **FR · ES · EN · DE** de forma independiente:

| Interfaz | Componente | Selector |
|---|---|---|
| Landing page (`/`) | `HomeLanding.tsx` | Pills en esquina superior derecha |
| Widget de chat (`/embed`) | `ChatWidget.tsx` | Combobox desplegable en la barra superior |

Los idiomas solo afectan a los textos de la UI; el modelo RAG responde en el idioma de la pregunta del usuario.

---

## Filtrado de contextos por chatbot (multi-tenant)

Cada instancia del widget puede limitarse a uno o varios contextos pasando el parámetro `contexts` (ids separados por coma) en la URL del iframe:

| Web que embebe | URL del iframe | Contextos accesibles |
|---|---|---|
| mercurio.lahavane.com | `/embed` | Todos (Mercurio + Destino + …) |
| destino-world.fr | `/embed?contexts=destino&theme=destino` | Solo Destino, tema oscuro |
| Otra web Odoo | `/embed?contexts=mercurio` | Solo Mercurio |

El filtro viaja por:
```
URL ?contexts=destino
  → embed/page.tsx (lee searchParams, pasa prop al widget)
  → ChatWidget (prop contexts → body del fetch)
  → /api/chat (lee contexts del body)
  → retrieve(question, 5, contexts)
  → buildSourceFilter() → expresión de filtro Upstash
  → index.query({ filter: "source = 'destino'" })
```

Sin `?contexts=`, no se aplica ningún filtro y se busca en toda la base vectorial.

---

## Despliegue

Vercel → variables de entorno en el dashboard. El workflow de GitHub Actions re-indexa nightly.
Para re-indexar manualmente una fuente: GitHub → Actions → "Re-indexar todas las fuentes" → Run workflow → escribir id de fuente.
