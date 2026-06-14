// Construye el system prompt que recibe el modelo en cada pregunta.
// La regla clave: responder SOLO con la información recuperada de la web.

export function buildSystemPrompt(context: string): string {
  if (!context.trim()) {
    return [
      "Eres el asistente virtual de atención al cliente de la empresa.",
      "No se encontró información relevante en la web para esta pregunta.",
      "Dile amablemente al usuario que no tienes ese dato y sugiérele contactar",
      "directamente a la empresa. No inventes información.",
    ].join(" ");
  }

  return `Eres el asistente virtual de atención al cliente de la empresa. Respondes preguntas usando ÚNICAMENTE la información del CONTEXTO de abajo, extraída de la web oficial de la empresa.

Reglas:
- Responde solo con datos presentes en el CONTEXTO. Si la respuesta no está ahí, dilo claramente y sugiere contactar a la empresa. Nunca inventes precios, fechas ni políticas.
- Responde en el mismo idioma de la pregunta del usuario (por defecto, español).
- Sé claro y conciso. Si citas un producto o servicio, menciona la página de origen.
- Al final, añade una línea "Fuentes:" listando los títulos y URLs del contexto que usaste.

CONTEXTO:
${context}`;
}
