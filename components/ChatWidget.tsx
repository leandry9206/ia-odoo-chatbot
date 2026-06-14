"use client";

import { useChat } from "ai/react";
import { useEffect, useRef, useState } from "react";

// ── Traducciones ────────────────────────────────────────────────
type Lang = "FR" | "ES" | "EN" | "DE";

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: "FR", flag: "🇫🇷", label: "FR" },
  { code: "ES", flag: "🇪🇸", label: "ES" },
  { code: "EN", flag: "🇬🇧", label: "EN" },
  { code: "DE", flag: "🇩🇪", label: "DE" },
];

const T: Record<Lang, {
  name: string; online: string;
  emptyTitle: string; emptyBody: string;
  placeholder: string; hint: string;
  close: string; open: string;
}> = {
  FR: {
    name:        "Mercure Assistant",
    online:      "En ligne · répond instantanément",
    emptyTitle:  "Bonjour ! Comment puis-je vous aider ?",
    emptyBody:   "Posez-moi des questions sur nos produits, services, circuits ou toute information de notre site web.",
    placeholder: "Écrivez votre question…",
    hint:        "Entrée pour envoyer · Maj+Entrée pour nouvelle ligne",
    close:       "Fermer",
    open:        "Ouvrir le chat",
  },
  ES: {
    name:        "Mercurio Asistente",
    online:      "En línea · responde al instante",
    emptyTitle:  "¡Hola! ¿En qué puedo ayudarte?",
    emptyBody:   "Pregúntame sobre nuestros productos, servicios, circuitos o cualquier información de nuestra web.",
    placeholder: "Escribe tu pregunta…",
    hint:        "Enter para enviar · Shift+Enter para saltar línea",
    close:       "Cerrar",
    open:        "Abrir chat",
  },
  EN: {
    name:        "Mercury Assistant",
    online:      "Online · responds instantly",
    emptyTitle:  "Hello! How can I help you?",
    emptyBody:   "Ask me about our products, services, tours or any information from our website.",
    placeholder: "Write your question…",
    hint:        "Enter to send · Shift+Enter for new line",
    close:       "Close",
    open:        "Open chat",
  },
  DE: {
    name:        "Merkur Assistent",
    online:      "Online · antwortet sofort",
    emptyTitle:  "Hallo! Wie kann ich Ihnen helfen?",
    emptyBody:   "Fragen Sie mich zu unseren Produkten, Dienstleistungen, Touren oder anderen Informationen unserer Website.",
    placeholder: "Schreiben Sie Ihre Frage…",
    hint:        "Enter zum Senden · Shift+Enter für neue Zeile",
    close:       "Schließen",
    open:        "Chat öffnen",
  },
};

// ── Helpers ─────────────────────────────────────────────────────
function renderContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="msg-link">
        {part}
      </a>
    ) : part
  );
}

// ── Icons ───────────────────────────────────────────────────────
const BotIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"/>
    <circle cx="9"  cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
    <path d="M12 11V7"/>
    <path d="M9 7a3 3 0 0 1 6 0"/>
  </svg>
);

const UserIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

// ── Component ───────────────────────────────────────────────────
export default function ChatWidget({
  alwaysOpen = false,
  contexts,
}: {
  alwaysOpen?: boolean;
  contexts?: string[]; // ids de fuentes a consultar; undefined = todos los contextos
}) {
  const [open, setOpen] = useState(alwaysOpen);
  const [lang, setLang] = useState<Lang>("FR");
  const tr = T[lang];

  const { messages, input, handleInputChange, handleSubmit, status } = useChat({
    api: "/api/chat",
    body: contexts && contexts.length > 0 ? { contexts } : undefined,
  });
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
        <div className={`panel${alwaysOpen ? " panel--embed" : ""}`} role="dialog" aria-label={tr.name}>

          {/* Selector de idioma — barra superior */}
          <div className="lang-bar">
            {LANGS.map((l) => (
              <button
                key={l.code}
                className={`lang-btn${lang === l.code ? " lang-btn--active" : ""}`}
                onClick={() => setLang(l.code)}
                aria-label={l.label}
              >
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-code">{l.label}</span>
              </button>
            ))}
          </div>

          {/* Header */}
          <div className="panel-head">
            <div className="panel-head-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="10" rx="2"/>
                <circle cx="9"  cy="16" r="1" fill="white" stroke="none"/>
                <circle cx="15" cy="16" r="1" fill="white" stroke="none"/>
                <path d="M12 11V7" stroke="white"/>
                <path d="M9 7a3 3 0 0 1 6 0" stroke="white"/>
              </svg>
            </div>
            <div className="panel-head-info">
              <strong>{tr.name}</strong>
              <span><span className="online-dot" />{tr.online}</span>
            </div>
            {!alwaysOpen && (
              <button className="close" onClick={() => setOpen(false)} aria-label={tr.close}>
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
                <strong>{tr.emptyTitle}</strong>
                {tr.emptyBody}
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
                  <span className="typing" aria-label="…"><span /><span /><span /></span>
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
              placeholder={tr.placeholder}
              aria-label={tr.placeholder}
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading || !input.trim()} aria-label="Enviar">
              <SendIcon />
            </button>
          </form>
          <p className="composer-hint">{tr.hint}</p>
        </div>
      )}

      {!alwaysOpen && (
        <button className="launcher" onClick={() => setOpen((o) => !o)} aria-label={open ? tr.close : tr.open}>
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
