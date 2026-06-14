// Singleton en memoria: persiste entre peticiones del mismo proceso Node.
// En local es perfecto. En producción (Vercel serverless) se resetea en cold-starts.
let rateLimitUntil = 0;
let lastProbeOkAt  = 0;

// Tiempo que se considera "fresco" un sondeo OK: durante este margen /api/status
// responde "disponible" sin volver a llamar a Groq.
const PROBE_TTL_MS = 60_000;

export function setRateLimit(seconds: number): void {
  rateLimitUntil = Date.now() + seconds * 1000;
}

export function getRateLimitStatus(): { available: boolean; retryAfter?: number } {
  const left = Math.ceil((rateLimitUntil - Date.now()) / 1000);
  if (left > 0) return { available: false, retryAfter: left };
  return { available: true };
}

// ¿Hace falta sondear realmente a Groq?
// No, si ya sabemos que está limitado o si sondeamos hace poco y salió OK.
export function needsProbe(): boolean {
  if (rateLimitUntil > Date.now()) return false;            // ya sabemos que está limitado
  if (Date.now() - lastProbeOkAt < PROBE_TTL_MS) return false; // sondeo OK reciente
  return true;
}

export function markProbeOk(): void {
  lastProbeOkAt = Date.now();
}
