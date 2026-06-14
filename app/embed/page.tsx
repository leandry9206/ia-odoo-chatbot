import ChatWidget from "@/components/ChatWidget";

// Página mínima y transparente: solo el widget, pensada para incrustarse
// en tu web Odoo mediante un <iframe>. Ver README, sección "Embeber en Odoo".
export default function Embed() {
  return (
    <div style={{ background: "transparent" }}>
      <ChatWidget alwaysOpen />
    </div>
  );
}
