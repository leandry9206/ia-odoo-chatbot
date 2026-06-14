import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <main className="demo">
      <div>
        <h1>Asistente de la empresa</h1>
        <p>
          Esta es una página de prueba. El asistente de abajo a la derecha responde
          preguntas usando el contenido indexado de tu web Odoo.
        </p>
      </div>
      <ChatWidget />
    </main>
  );
}
