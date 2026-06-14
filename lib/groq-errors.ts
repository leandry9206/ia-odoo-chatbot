// Utilidades para interpretar errores de rate-limit de Groq.
// Compartidas entre /api/chat (detección al responder) y /api/status (sondeo).

export function parseGroqRetryTime(msg: string): number | null {
  // "Please try again in 12m4.032s" o "try again in 45.5s"
  const match = msg.match(/try again in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
  if (!match) return null;
  const minutes = match[1] ? parseInt(match[1], 10) : 0;
  const seconds = parseFloat(match[2]);
  return Math.ceil(minutes * 60 + seconds);
}

export function rateLimitSeconds(err: unknown): number | null {
  const e = err as Record<string, unknown>;
  const status = (e?.statusCode ?? e?.status) as number | undefined;
  const msg    = String(e?.message ?? "");
  const msgLow = msg.toLowerCase();

  if (
    status !== 429 &&
    !msgLow.includes("rate_limit_exceeded") &&
    !msgLow.includes("rate limit") &&
    !msgLow.includes("too many requests")
  ) {
    return null;
  }

  // Ignorar límites TPM (tokens por minuto) — se resuelven solos en segundos.
  // Solo bloquear en TPD (tokens por día) que es el límite real de la cuota.
  const isTPM = (msgLow.includes("per minute") || msgLow.includes("(tpm)")) &&
                !msgLow.includes("per day");
  if (isTPM) return null;

  const fromMsg = parseGroqRetryTime(msg);
  if (fromMsg !== null) return Math.max(10, fromMsg);

  const headers = e?.responseHeaders as Record<string, string> | undefined;
  const raw     = headers?.["retry-after"] ?? headers?.["x-ratelimit-reset-requests"];
  const parsed  = raw ? parseInt(String(raw), 10) : NaN;
  return isNaN(parsed) ? 60 : Math.max(10, parsed);
}
