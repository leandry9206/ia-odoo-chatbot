"use client";

import { useEffect, useRef, useState } from "react";
import FlagIcon from "./FlagIcon";

type Lang = "FR" | "ES" | "EN" | "DE";

const LANGS: { code: Lang }[] = [
  { code: "FR" },
  { code: "ES" },
  { code: "EN" },
  { code: "DE" },
];

const T: Record<Lang, {
  badge: string;
  title: string;
  titleGrad: string;
  sub1: string;
  sub2: string;
  mercurioName: string;
  mercurioDesc: string;
  mercurioPill: string;
  destinoDesc: string;
  destinoPill: string;
  footerLabel: string;
}> = {
  FR: {
    badge:        "Méthode · Réceptif · Voyage",
    title:        "Deux assistants,",
    titleGrad:    "une seule plateforme.",
    sub1:         "Chaque chatbot a son propre contexte et thème visuel.",
    sub2:         "Choisissez-en un et commencez maintenant !",
    mercurioName: "Mercurio Assistant",
    mercurioDesc: "Odoo · tous les contextes",
    mercurioPill: "Général",
    destinoDesc:  "Ghost · contexte Destino uniquement",
    destinoPill:  "Méthodologie",
    footerLabel:  "URLs d'intégration",
  },
  ES: {
    badge:        "Método · Receptivo · Viaje",
    title:        "Dos asistentes,",
    titleGrad:    "una sola plataforma.",
    sub1:         "Cada chatbot tiene su propio contexto y temática visual.",
    sub2:         "Elige uno y comienza ahora !",
    mercurioName: "Mercurio Asistente",
    mercurioDesc: "Odoo · todos los contextos",
    mercurioPill: "General",
    destinoDesc:  "Ghost · solo contexto Destino",
    destinoPill:  "Metodología",
    footerLabel:  "URLs de embed",
  },
  EN: {
    badge:        "Method · Inbound · Travel",
    title:        "Two assistants,",
    titleGrad:    "one single platform.",
    sub1:         "Each chatbot has its own context and visual theme.",
    sub2:         "Pick one and start now !",
    mercurioName: "Mercurio Assistant",
    mercurioDesc: "Odoo · all contexts",
    mercurioPill: "General",
    destinoDesc:  "Ghost · Destino context only",
    destinoPill:  "Methodology",
    footerLabel:  "Embed URLs",
  },
  DE: {
    badge:        "Methode · Empfang · Reise",
    title:        "Zwei Assistenten,",
    titleGrad:    "eine einzige Plattform.",
    sub1:         "Jeder Chatbot hat seinen eigenen Kontext und sein eigenes visuelles Thema.",
    sub2:         "Wähle einen aus und starte jetzt !",
    mercurioName: "Mercurio Assistent",
    mercurioDesc: "Odoo · alle Kontexte",
    mercurioPill: "Allgemein",
    destinoDesc:  "Ghost · nur Destino-Kontext",
    destinoPill:  "Methodik",
    footerLabel:  "Einbettungs-URLs",
  },
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: "transform 0.12s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

export default function HomeLanding() {
  const [lang, setLang]     = useState<Lang>("FR");
  const [isOpen, setIsOpen] = useState(false);
  const dropRef             = useRef<HTMLDivElement>(null);
  const t                   = T[lang];
  const current             = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: MouseEvent) => {
      if (!dropRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [isOpen]);

  return (
    <main className="landing">

      {/* ── Selector de idioma ── */}
      <div className="l-lang-bar">
        <div className="l-lang-combobox" ref={dropRef}>
          <button
            className="l-lang-trigger"
            onClick={() => setIsOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="l-lang-flag"><FlagIcon code={current.code} /></span>
            <span>{current.code}</span>
            <ChevronIcon open={isOpen} />
          </button>

          {isOpen && (
            <ul className="l-lang-dropdown" role="listbox" aria-label="Idioma">
              {LANGS.map((l) => (
                <li
                  key={l.code}
                  className={`l-lang-option${lang === l.code ? " l-lang-option--active" : ""}`}
                  role="option"
                  aria-selected={lang === l.code}
                  onClick={() => { setLang(l.code); setIsOpen(false); }}
                >
                  <span className="l-lang-flag"><FlagIcon code={l.code} /></span>
                  <span>{l.code}</span>
                  {lang === l.code && (
                    <span className="l-lang-check"><CheckIcon /></span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Background ── */}
      <div className="l-bg" aria-hidden="true">
        <div className="l-orb l-orb--a" />
        <div className="l-orb l-orb--b" />
        <div className="l-grid" />
      </div>

      {/* ── Hero ── */}
      <header className="l-hero">
        <div className="l-badge">
          <span className="l-badge-dot" />
          {t.badge}
        </div>
        <h1 className="l-title">
          {t.title}<br />
          <span className="l-title-grad">{t.titleGrad}</span>
        </h1>
        <p className="l-sub">
          {t.sub1}
          <br />
          {t.sub2}
        </p>
      </header>

      {/* ── Cards ── */}
      <section className="l-cards" aria-label="Asistentes disponibles">

        {/* Mercurio */}
        <article className="l-card l-card--m">
          <div className="l-card-head l-card-head--m">
            <div className="l-icon l-icon--m">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.8-5.4A8.5 8.5 0 1 1 21 11.5z"/>
              </svg>
            </div>
            <div className="l-card-info">
              <p className="l-card-name">{t.mercurioName}</p>
              <p className="l-card-desc">{t.mercurioDesc}</p>
            </div>
            <span className="l-pill l-pill--m">{t.mercurioPill}</span>
          </div>
          <div className="l-iframe-wrap">
            <iframe
              src="/embed"
              title="Mercurio — Chatbot general"
              className="l-iframe"
              loading="lazy"
            />
          </div>
        </article>

        {/* Destino */}
        <article className="l-card l-card--d">
          <div className="l-card-head l-card-head--d">
            <div className="l-icon l-icon--d">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div className="l-card-info">
              <p className="l-card-name">Destino World</p>
              <p className="l-card-desc">{t.destinoDesc}</p>
            </div>
            <span className="l-pill l-pill--d">{t.destinoPill}</span>
          </div>
          <div className="l-iframe-wrap">
            <iframe
              src="/embed?contexts=destino&theme=destino"
              title="Destino World — Guía de viajes"
              className="l-iframe"
              loading="lazy"
            />
          </div>
        </article>

      </section>

      {/* ── Footer ── */}
      <footer className="l-footer">
        <p className="l-footer-label">{t.footerLabel}</p>
        <div className="l-footer-urls">
          <code className="l-url">/embed</code>
          <code className="l-url">/embed?contexts=destino&amp;theme=destino</code>
        </div>
      </footer>

    </main>
  );
}
