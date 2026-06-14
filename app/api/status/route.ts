import {
  getRateLimitStatus,
  setRateLimit,
  needsProbe,
  markProbeOk,
} from "@/lib/groq-rate-limit";
import { rateLimitSeconds } from "@/lib/groq-errors";
import { GROQ_MODEL } from "@/lib/groq-config";

export const runtime = "nodejs";

// GET /api/status → { available, retryAfter? }
//
// Estrategia de coste mínimo:
//   1. Si el singleton ya sabe que estamos limitados → responde sin tocar Groq (0 tokens)
//   2. Si sondeamos hace < 60 s y salió OK → responde "disponible" sin tocar Groq (0 tokens)
//   3. Solo en cold-start / sin info reciente → un sondeo mínimo a Groq (fetch directo):
//        · si está limitado (TPD), el 429 se rechaza sin consumir tokens
//        · si está disponible, consume ~unos pocos tokens (cacheado 60 s)
export async function GET() {
  const resHeaders = { "Cache-Control": "no-store, max-age=0" };

  const cached = getRateLimitStatus();
  if (!cached.available) {
    return Response.json(cached, { headers: resHeaders });
  }

  if (!needsProbe()) {
    return Response.json({ available: true }, { headers: resHeaders });
  }

  try {
    // Fetch directo a Groq: acceso determinista al status HTTP, body y headers.
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
    });

    if (res.status === 429) {
      // Reconstruir un objeto compatible con rateLimitSeconds (que filtra TPM y lee el tiempo).
      const body = await res.text();
      const secs = rateLimitSeconds({
        statusCode: 429,
        message: body,
        responseHeaders: { "retry-after": res.headers.get("retry-after") ?? "" },
      });
      if (secs !== null) {
        setRateLimit(secs); // memoriza para no volver a sondear
        return Response.json({ available: false, retryAfter: secs }, { headers: resHeaders });
      }
      // 429 por TPM (tokens por minuto) → se resuelve en segundos, no bloquear.
      return Response.json({ available: true }, { headers: resHeaders });
    }

    if (res.ok) {
      markProbeOk();
      return Response.json({ available: true }, { headers: resHeaders });
    }

    // Otro error (5xx, auth…) → no bloquear al usuario.
    console.error("Sondeo /api/status, status inesperado:", res.status);
    return Response.json({ available: true }, { headers: resHeaders });
  } catch (err) {
    console.error("Sondeo /api/status falló:", err);
    return Response.json({ available: true }, { headers: resHeaders });
  }
}
