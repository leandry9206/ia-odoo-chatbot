import ChatWidget from "@/components/ChatWidget";

// Página mínima y transparente: solo el widget, pensada para incrustarse
// en cualquier web mediante un <iframe>.
//
// Filtrar por contexto vía query param:
//   /embed                          → todos los contextos (Mercurio + Destino + ...)
//   /embed?contexts=destino         → solo Destino
//   /embed?contexts=mercurio        → solo Mercurio
//   /embed?contexts=mercurio,destino → ambos (equivalente a sin filtro)

export default async function Embed({
  searchParams,
}: {
  searchParams: Promise<{ contexts?: string }>;
}) {
  const params = await searchParams;
  const contexts = params.contexts
    ? params.contexts.split(",").map((c) => c.trim()).filter(Boolean)
    : undefined;

  return (
    <div style={{ background: "transparent" }}>
      <ChatWidget alwaysOpen contexts={contexts} />
    </div>
  );
}
