import ChatWidget from "@/components/ChatWidget";
import { getRateLimitStatus } from "@/lib/groq-rate-limit";

// Página mínima y transparente: solo el widget, pensada para incrustarse
// en cualquier web mediante un <iframe>.
//
// Parámetros de URL:
//   ?contexts=destino            → filtra la base vectorial a esa fuente
//   ?theme=destino               → aplica el tema visual azul (Destino)
//   ?contexts=mercurio&theme=odoo → tema morado Odoo con solo Mercurio
//
// Ejemplos de embed:
//   Mercurio (todos los contextos, tema Odoo):  /embed
//   Destino  (solo su contexto, tema azul):     /embed?contexts=destino&theme=destino

export default async function Embed({
  searchParams,
}: {
  searchParams: Promise<{ contexts?: string; theme?: string }>;
}) {
  const params = await searchParams;

  // Lectura del singleton en el servidor — cero llamadas a Groq.
  // Ambas páginas /embed se renderizan en el mismo proceso Node, por lo que
  // leen exactamente el mismo valor: los dos widgets arrancan con estado idéntico.
  const status = getRateLimitStatus();
  const initialRateLimitSeconds = status.available ? null : (status.retryAfter ?? null);

  const contexts = params.contexts
    ? params.contexts.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  const theme = params.theme === "destino" ? "destino" : "odoo";

  return (
    <div style={{ background: "transparent" }}>
      <ChatWidget
        alwaysOpen
        contexts={contexts}
        theme={theme}
        initialRateLimitSeconds={initialRateLimitSeconds}
      />
    </div>
  );
}
