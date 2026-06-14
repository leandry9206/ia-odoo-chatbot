# Instrucciones del proyecto para Claude

## Inicio de sesión

Al comenzar cualquier conversación en este proyecto, lee primero **`architecture.MD`** para tener contexto completo del stack, archivos clave y flujo de datos antes de responder o hacer cambios.

## Actualizaciones de documentación

Después de **cualquier cambio de código**, actualiza siempre sin que se te pida:

1. **`README.md`** — Stack, variables de entorno, scripts o flujo principal si cambian.
2. **`architecture.MD`** — Tabla de archivos clave, sección de modelo/proveedor, cualquier sección afectada por el cambio.

Hazlo en el mismo turno, antes del commit.

## Commits y push

Cuando el usuario pida commit y push, hazlo en este orden:
1. `git add` de los archivos modificados (nunca `git add .` ni `git add -A`)
2. Commit con mensaje descriptivo en el idioma del cambio (español si el proyecto es en español)
3. `git push origin main`

## Contexto del proyecto

- Chat: **Groq** (`meta-llama/llama-4-scout-17b-16e-instruct`, free tier; en `lib/groq-config.ts`)
- Embeddings: **Gemini** (`gemini-embedding-001`, 768 dims, COSINE)
- Base vectorial: **Upstash Vector** (serverless)
- Hosting: **Vercel**
- Frontend: **Next.js 15** App Router, TypeScript
- Widget embebible en iframes — dos instancias: Mercurio (tema morado) y Destino (tema marino oscuro)
- Multiidioma: FR · ES · EN · DE (en `ChatWidget.tsx` objeto `T` y en `HomeLanding.tsx`)
