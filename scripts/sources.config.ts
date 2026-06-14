// Define todas las fuentes de datos del RAG.
// Añade aquí nuevas fuentes sin tocar el crawler ni el ingestor.

export interface Source {
  id: string;       // identificador único → prefijo de IDs en Upstash
  context: string;  // etiqueta legible que se inyecta en el prompt del modelo
  siteUrl: string;  // URL base (sin barra final)
  type: "odoo" | "ghost" | "generic";
}

export function getSources(): Source[] {
  const all: Source[] = [
    {
      id: "mercurio",
      context: "Mercurio",
      siteUrl: (process.env.ODOO_SITE_URL ?? "").replace(/\/$/, ""),
      type: "odoo",
    },
    {
      id: "destino",
      context: "metodología del receptivo y experiencias",
      siteUrl: (process.env.DESTINO_SITE_URL ?? "https://destino-world.fr").replace(/\/$/, ""),
      type: "ghost",
    },
  ];
  // Solo incluir fuentes que tengan URL configurada
  return all.filter((s) => s.siteUrl);
}
