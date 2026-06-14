# Arquitectura del proyecto — ia-odoo-chatbot

Chatbot RAG (Retrieval-Augmented Generation) que indexa múltiples webs y responde con Groq (Llama).
Stack: Next.js 15 · Groq `llama-4-scout-17b-16e-instruct` (chat) · Gemini `gemini-embedding-001` (embeddings) · Upstash Vector · Vercel.

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
| `lib/prompt.ts` | `buildSystemPrompt(context, bot)` → identidad por bot (`mercurio`/`destino`, en `IDENTITIES`) + reglas de tono humano (sin muletillas robóticas ni disclaimers de IA) + grounding RAG. Exporta `BotId` |
| `app/api/chat/route.ts` | Endpoint POST: recibe `messages`, `contexts`, `bot`; llama `retrieve`, llama Groq (modelo de `lib/groq-config.ts`, `temperature 0.5`), stream de respuesta. Detecta 429 y devuelve `RATE_LIMIT:<segundos>` |
| `app/api/status/route.ts` | Endpoint GET: lee el singleton; si no sabe (cold-start) hace **un** sondeo mínimo a Groq vía `fetch` directo (no SDK → status/body/headers deterministas), cacheado 60 s. Devuelve `{ available, retryAfter? }` |
| `lib/groq-rate-limit.ts` | Singleton en memoria del rate-limit: `setRateLimit`, `getRateLimitStatus`, `needsProbe`, `markProbeOk` (caché de sondeo 60 s) |
| `lib/groq-errors.ts` | Parseo de errores 429 de Groq: `parseGroqRetryTime` (lee `"try again in 12m4s"`) y `rateLimitSeconds` (filtra TPM, devuelve segundos de TPD). Compartido por `/api/chat` y `/api/status` |
| `lib/groq-config.ts` | `GROQ_MODEL` — nombre del modelo de chat en un único sitio; cambiarlo afecta a `/api/chat` y `/api/status` |
| `app/page.tsx` | Punto de entrada raíz — renderiza `<HomeLanding />` |
| `components/HomeLanding.tsx` | **Landing page** (client): dos chatbots en iframes, selector de idioma para el home (FR/ES/EN/DE) |
| `app/embed/page.tsx` | Página de embed mínima: lee `?contexts` y `?theme`, lee el singleton de rate-limit en el servidor y pasa `initialRateLimitSeconds` al widget (comprobación única a nivel de app) |
| `components/ChatWidget.tsx` | Widget React del chat: combobox de idioma (FR/ES/EN/DE), temas odoo y destino. Envía `bot` (derivado del tema) al API. Comprobación de disponibilidad al montar (localStorage → `/api/status`). Indicador de estado con 3 modos (online/checking/waiting). Banner rate-limit rediseñado + countdown |
| `components/FlagIcon.tsx` | Banderas en SVG inline (FR/ES/EN/DE). Sustituyen a los emojis de bandera, que Chrome en Windows no renderiza. Usado por `ChatWidget` y `HomeLanding` |
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
- Dimensiones: 768 (`gemini-embedding-001` con `outputDimensionality: 768`)
- Métrica: COSINE
- Score mínimo de relevancia: 0.4 (en `lib/retrieval.ts`)
- Top-K por consulta: 5

---

## Soporte multiidioma

Ambas interfaces — la landing y el widget de chat — soportan **FR · ES · EN · DE** de forma independiente:

| Interfaz | Componente | Selector |
|---|---|---|
| Landing page (`/`) | `HomeLanding.tsx` | Combobox desplegable en la esquina superior derecha |
| Widget de chat (`/embed`) | `ChatWidget.tsx` | Combobox desplegable en la barra superior del widget |

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

## Widget flotante externo

Para integrar el chatbot en cualquier web (Odoo, Ghost, WordPress…) sin modificar el proyecto, se añade un snippet HTML que abre un `<iframe>` flotante sobre la página:

| Site | Color botón | URL iframe |
|---|---|---|
| mercurio.lahavane.com (Odoo) | `#5f5e97` (morado) | `/embed` |
| destino-world.fr (Ghost) | `#0f141c → #243d52` (marino) | `/embed?contexts=destino&theme=destino` |

El snippet incluye: botón circular fijo, `<iframe>` oculto, toggle JS, animación de apertura y cambio de icono chat/×. IDs únicos por sitio (`chatbot-btn` / `chatbot-btn-d`) para coexistir si ambos se usan en la misma página.

---

## Hoja de ruta — Ampliaciones planificadas

### Conexión BD Odoo interna

Conectar el agente directamente a la base de datos PostgreSQL de Odoo vía API XML-RPC o JSON-RPC. Permitiría consultar en tiempo real pedidos, clientes, productos y contactos, enriqueciendo las respuestas del agente con datos operativos que no están en el sitemap público.

Integración prevista: nuevo tool/function en `app/api/chat/route.ts` que llame a la API de Odoo antes de construir el prompt.

### Sistema CRA VL (Mercurio)

Módulo de Mercurio para la creación de viajes con ritmo y coherencia. El agente actuará como asistente del vendedor externo: sugerirá etapas, ritmos de viaje, coherencia de destinos y experiencias. Requiere indexar la lógica del CRA VL como fuente adicional y posiblemente un modo conversacional guiado (multi-step).

### Metodología RST (ficheros .rst)

Indexar los ficheros de documentación antigua en formato RST (reStructuredText) como nueva fuente de conocimiento. Pipeline idéntica a Odoo/Ghost:

1. Nuevo script `scripts/crawl-rst.ts` — lee `.rst` locales, extrae texto limpio
2. `scripts/ingest.ts` — chunking + embeddings → Upstash con `source: 'metodologia'`
3. Añadir entrada en `scripts/sources.config.ts` con `id: 'metodologia'`
4. El agente puede filtrar con `?contexts=metodologia`

---

## Backups de la base de conocimiento vectorial

### Exportar

```bash
npm run export
# → llama a Upstash list-vectors API (paginado)
# → guarda en data/backup-YYYY-MM-DD.json
# Estructura: [{ id, vector: number[768], metadata: { text, url, title, source } }]
```

Almacenar el JSON resultante en:
- **GitHub** (con Git LFS si supera 50 MB)
- **Google Drive / S3** para backups periódicos

### Restaurar / Migrar

```bash
npm run import --file data/backup-YYYY-MM-DD.json
# Lee el JSON, opcionalmente filtra por source
# Llama a upsertChunks() en el nuevo índice Upstash
# También sirve para migrar a otro proveedor vectorial (Pinecone, Qdrant, pgvector…)
```

---

## Identidad y tono del agente

`lib/prompt.ts` da al agente una **identidad por bot** (objeto `IDENTITIES`, claves `mercurio` / `destino`): nombre + descripción de la empresa. El widget envía `bot` (derivado del tema) → `/api/chat` → `buildSystemPrompt(context, bot)`. Esto evita las respuestas genéricas ("soy un asistente de una empresa") porque el agente conoce su nombre y a quién representa.

El prompt impone además un **tono humano**: prohíbe muletillas robóticas ("no tengo información específica sobre…", "según mis datos"), disclaimers sobre limitaciones de IA, y mentir afirmando ser una persona de carne y hueso. `temperature` está en `0.5` para un tono más natural sin disparar invenciones. Los datos de negocio (precios, circuitos, políticas) siguen saliendo SOLO del CONTEXTO RAG.

> ⚠️ Las descripciones de empresa en `IDENTITIES` son un borrador; ajustar con los datos reales de cada negocio.

---

## Modelo de chat y gestión de rate-limit

El chat usa **Groq** (`meta-llama/llama-4-scout-17b-16e-instruct`, free tier; definido en `lib/groq-config.ts`). Los embeddings siguen con **Gemini** (`gemini-embedding-001`).

Cuando Groq devuelve HTTP 429 (cuota agotada):

1. `rateLimitSeconds()` (en `lib/groq-errors.ts`) parsea el tiempo exacto del mensaje de error Groq (`"try again in 12m4.032s"`) y como fallback usa el header `retry-after`. `route.ts` además llama a `setRateLimit()` para memorizar el estado en el singleton
2. Devuelve el token `RATE_LIMIT:<segundos>` al cliente (vía stream error o HTTP 429)
3. `useChat.onError` en `ChatWidget.tsx` detecta el token, fija `rateLimitedUntil` y persiste en `localStorage` (que sincroniza el otro chatbot vía evento `storage`)
4. Un `setInterval` hace el countdown; mientras está activo:
   - El textarea y el botón de envío quedan deshabilitados
   - Se muestra un banner con reloj, mensaje en el idioma activo y cuenta atrás visible
   - No se realizan llamadas adicionales a la API

**Comprobación proactiva al cargar — comprobación única a nivel de aplicación:**

`app/embed/page.tsx` (server component) lee el singleton `getRateLimitStatus()` durante el SSR y pasa `initialRateLimitSeconds` como prop a `ChatWidget`. Ambas páginas `/embed` se renderizan en el mismo proceso Node, por lo que obtienen **exactamente el mismo valor**: los dos widgets arrancan con estado idéntico.

Flujo según escenario:
1. **Singleton tiene rate-limit** → ambas páginas se renderizan con `initialRateLimitSeconds > 0` → `ChatWidget` aplica el estado directamente sin tocar `localStorage` ni `/api/status` → ambos muestran naranja desde el primer frame
2. **Singleton vacío** (cold-start / servidor recién iniciado) → `initialRateLimitSeconds = null` → el widget hace fallback: `localStorage` → `GET /api/status`, que hace **un** sondeo mínimo a Groq vía `fetch` directo (cacheado 60 s) para conocer el estado real. Se usa `fetch` en vez del SDK porque el SDK envolvía el error 429 y el sondeo lo "tragaba" reportando disponible incorrectamente

El indicador de estado tiene 3 modos: gris pulsante (verificando) → verde (online) → naranja (en espera).

**Sincronización en tiempo real entre los dos chatbots:**

Cuando un widget detecta el rate-limit al enviar un mensaje (`useChat.onError` → `applyRateLimit`), escribe en `localStorage`. El evento nativo `storage` se dispara en los **otros** iframes del mismo origen → un `useEffect` con listener pasa todos los widgets a "en espera" a la vez, sin recargar la página. Al expirar, se limpia `localStorage` y el evento devuelve todos a "en línea".

**Consumo de la API de Groq por las comprobaciones de estado:**
- Leer el singleton (caso normal) = **0 tokens** (no toca Groq)
- Sondeo en cold-start: si está limitado, el 429 se rechaza **sin consumir tokens**; si está disponible, ~unos pocos tokens, y se cachea 60 s

---

## Despliegue

Vercel → variables de entorno en el dashboard. El workflow de GitHub Actions re-indexa nightly.
Para re-indexar manualmente una fuente: GitHub → Actions → "Re-indexar todas las fuentes" → Run workflow → escribir id de fuente.
