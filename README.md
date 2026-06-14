# ia-odoo-chatbot

Plataforma de **dos chatbots RAG** (Retrieval-Augmented Generation) que indexan webs externas (Odoo + Ghost) y responden con **Google Gemini** en streaming. Desplegable en Vercel de forma completamente gratuita.

## Demo

| Ruta | Descripción |
|---|---|
| `/` | Landing page — muestra los dos chatbots embebidos lado a lado |
| `/embed` | Mercurio Asistente — todos los contextos, tema morado |
| `/embed?contexts=destino&theme=destino` | Destino World — solo contexto Destino, tema oscuro |

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Google Gemini** vía `@ai-sdk/google`
  - Chat: `gemini-2.5-flash`
  - Embeddings: `gemini-embedding-001` (768 dimensiones, COSINE)
- **Upstash Vector** — base vectorial serverless
- **Vercel** — hosting
- **GitHub Actions** — re-indexado en cron (nightly)

## Fuentes de datos

| id | Tipo web | Contexto en el RAG |
|---|---|---|
| `mercurio` | Odoo (`ODOO_SITE_URL`) | Información general de la empresa |
| `destino` | Ghost (`DESTINO_SITE_URL`) | Metodología del receptivo y experiencias de viaje |

## Multiidioma

Ambas interfaces soportan **FR · ES · EN · DE** de forma independiente.

- **Landing page** (`/`): selector de pills en la esquina superior derecha. Idioma por defecto: **FR**.
- **Widget de chat** (`/embed`): combobox desplegable en la barra superior de cada chat.

Los textos de la UI cambian con el idioma seleccionado. El modelo responde en el idioma de la pregunta del usuario.

---

## Instalación local

### 1. Requisitos previos (cuentas gratuitas, sin tarjeta)

1. **Google AI Studio** → [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → *Create API key*
2. **Upstash** → [console.upstash.com](https://console.upstash.com) → *Vector* → *Create Index*
   - Dimensions: **768** · Metric: **COSINE**
   - Copia la *REST URL* y el *REST TOKEN*

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

```env
GOOGLE_GENERATIVE_AI_API_KEY=   # Chat + embeddings (misma key)
UPSTASH_VECTOR_REST_URL=        # Endpoint Upstash Vector
UPSTASH_VECTOR_REST_TOKEN=      # Token Upstash Vector
ODOO_SITE_URL=                  # URL base de tu web Odoo
DESTINO_SITE_URL=               # URL base de Destino (default: https://destino-world.fr)
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Indexar las fuentes (una vez)

```bash
npm run reindex              # Todas las fuentes
npm run reindex:mercurio     # Solo Mercurio
npm run reindex:destino      # Solo Destino
```

### 5. Arrancar en desarrollo

```bash
npm run dev   # http://localhost:3000
```

---

## Despliegue en Vercel (gratis)

1. Sube el proyecto a GitHub
2. En Vercel → *Add New Project* → importa el repo (detecta Next.js automáticamente)
3. En *Settings → Environment Variables* añade las 5 variables del `.env.local`
4. *Deploy* → tendrás URL pública. Cada `git push` redespliega

---

## Re-indexado automático (GitHub Actions)

En *Settings → Secrets and variables → Actions* del repo, añade los mismos secretos del `.env.local`.

El workflow `.github/workflows/reindex.yml` re-indexa cada noche (3:00 UTC). Para re-indexar a mano: *Actions → "Re-indexar todas las fuentes" → Run workflow*.

---

## Integrar en una web externa

Añade un `<iframe>` apuntando a tu dominio:

```html
<!-- Mercurio (todos los contextos, tema morado) -->
<iframe src="https://tu-dominio.vercel.app/embed"
        style="width:400px;height:580px;border:none;"></iframe>

<!-- Destino (solo su contexto, tema oscuro) -->
<iframe src="https://tu-dominio.vercel.app/embed?contexts=destino&theme=destino"
        style="width:400px;height:580px;border:none;"></iframe>
```

Parámetros de URL disponibles en `/embed`:

| Parámetro | Valores | Efecto |
|---|---|---|
| `contexts` | `mercurio`, `destino`, `mercurio,destino` | Filtra la búsqueda vectorial a esas fuentes |
| `theme` | `odoo` (defecto), `destino` | Aplica el tema visual del chatbot |

---

## Ajustes útiles

| Qué cambiar | Dónde |
|---|---|
| Tono y reglas del bot | `lib/prompt.ts` |
| Nº de fragmentos / umbral de relevancia | `lib/retrieval.ts` (`topK`, `MIN_SCORE`) |
| Tamaño de los fragmentos | `scripts/ingest.ts` (`CHUNK_WORDS`, `OVERLAP_WORDS`) |
| Modelo de chat de Gemini | `app/api/chat/route.ts` |
| Modelo/dimensiones de embeddings | `lib/embeddings.ts` (`EMBED_DIMS`) |
| Añadir nueva fuente de datos | `scripts/sources.config.ts` → nuevo entry → `npm run reindex` |
| Colores y diseño del widget | `app/globals.css` |
| Textos e idiomas del widget | `components/ChatWidget.tsx` → objeto `T` |
| Textos e idiomas de la landing | `components/HomeLanding.tsx` → objeto `T` |

> Si cambias `EMBED_DIMS`, recrea el índice de Upstash con las mismas dimensiones y vuelve a indexar.
