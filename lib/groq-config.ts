// Modelo de chat de Groq (free tier). Cambiarlo aquí afecta a la vez a
// /api/chat (respuestas) y a /api/status (sondeo de disponibilidad).
//
// Alternativas gratuitas y sus límites (RPD = req/día, TPD = tokens/día, TPM = tokens/min):
//   llama-3.3-70b-versatile               RPD 1K  · TPD 100K · TPM 12K
//   meta-llama/llama-4-scout-17b-16e-instruct  RPD 1K  · TPD 500K · TPM 30K  ← más cuota
//   openai/gpt-oss-120b                   RPD 1K  · TPD 200K · TPM 8K
//   qwen/qwen3-32b                        RPD 1K  · TPD 500K · TPM 6K
export const GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
