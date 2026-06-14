"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <>
      {open && (
        <div className="panel" role="dialog" aria-label="Asistente virtual">
          <div className="panel-head">
            <span className="dot" aria-hidden />
            <div>
              <strong>Asistente</strong>{" "}
              <span>· responde sobre nuestra web</span>
            </div>
            <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar">
              ×
            </button>
          </div>

          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && (
              <p className="empty">
                Hola 👋 Pregúntame sobre nuestros productos, servicios o información
                de la empresa. Respondo con base en nuestra web.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
                {m.content}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="bubble assistant">
                <span className="typing" aria-label="Escribiendo">
                  <span /> <span /> <span />
                </span>
              </div>
            )}
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje"
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading || !input.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        className="launcher"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        )}
      </button>
    </>
  );
}
