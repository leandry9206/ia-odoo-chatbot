"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";

// Convierte URLs en texto plano a elementos <a> clicables
function renderContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">
        {part}
      </a>
    ) : (
      part
    )
  );
}

const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
    <path d="M12 11V7m-4 4V9m8 2V9"/>
    <path d="M9 7a3 3 0 0 1 6 0"/>
  </svg>
);

const UserIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13"/>
    <path d="M22 2L15 22l-4-9-9-4 20-7z"/>
  </svg>
);

export default function ChatWidget({ alwaysOpen = false }: { alwaysOpen?: boolean }) {
  const [open, setOpen] = useState(alwaysOpen);
  const { messages, input, handleInputChange, handleSubmit, status } = useChat({ api: "/api/chat" });
  const scrollRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef     = useRef<HTMLFormElement>(null);
  const isLoading   = status === "submitted" || status === "streaming";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 130) + "px";
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) formRef.current?.requestSubmit();
    }
  };

  return (
    <>
      {open && (
        <div className={`panel${alwaysOpen ? " panel--embed" : ""}`} role="dialog" aria-label="Asistente virtual">

          {/* Header */}
          <div className="panel-head">
            <div className="panel-head-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="9" cy="16" r="1" fill="white" stroke="none"/>
                <circle cx="15" cy="16" r="1" fill="white" stroke="none"/>
                <path d="M12 11V7m-4 4V9m8 2V9" stroke="white"/>
                <path d="M9 7a3 3 0 0 1 6 0" stroke="white"/>
              </svg>
            </div>
            <div className="panel-head-info">
              <strong>Asistente Virtual</strong>
              <span><span className="online-dot" />En línea · responde al instante</span>
            </div>
            {!alwaysOpen && (
              <button className="close" onClick={() => setOpen(false)} aria-label="Cerrar chat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Mensajes */}
          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty">
                <span className="empty-icon">🤖</span>
                <strong>¡Hola! ¿En qué puedo ayudarte?</strong>
                Pregúntame sobre nuestros productos, servicios, circuitos o cualquier información de nuestra web.
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`bubble-row${m.role === "user" ? " user" : ""}`}>
                <div className="bubble-avatar">
                  {m.role === "user" ? <UserIcon /> : <BotIcon />}
                </div>
                <div className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="bubble-row">
                <div className="bubble-avatar"><BotIcon /></div>
                <div className="bubble assistant">
                  <span className="typing" aria-label="Escribiendo">
                    <span /><span /><span />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Compositor */}
          <form ref={formRef} className="composer" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje"
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar">
              <SendIcon />
            </button>
          </form>
          <p className="composer-hint">Enter para enviar · Shift+Enter para saltar línea</p>
        </div>
      )}

      {!alwaysOpen && (
        <button
          className="launcher"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar chat" : "Abrir chat"}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5z"/>
            </svg>
          )}
        </button>
      )}
    </>
  );
}
