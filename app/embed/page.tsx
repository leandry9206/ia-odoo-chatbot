import ChatWidget from "@/components/ChatWidget";

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

  const contexts = params.contexts
    ? params.contexts.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  const theme = params.theme === "destino" ? "destino" : "odoo";

  return (
    <div style={{ background: "transparent" }}>
      <ChatWidget alwaysOpen contexts={contexts} theme={theme} />
    </div>
  );
}
