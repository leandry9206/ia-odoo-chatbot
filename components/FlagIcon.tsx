// Banderas en SVG inline. Sustituyen a los emojis 🇫🇷🇪🇸🇬🇧🇩🇪, que Chrome en
// Windows no renderiza (no hay fuente de color con banderas → se ven como "FR", "ES").
// Así se ven igual en cualquier navegador y sistema operativo.

export type FlagCode = "FR" | "ES" | "EN" | "DE";

const FLAGS: Record<FlagCode, React.ReactNode> = {
  // Francia — azul / blanco / rojo (vertical)
  FR: (
    <>
      <rect width="8" height="18" fill="#0055A4" />
      <rect x="8" width="8" height="18" fill="#FFFFFF" />
      <rect x="16" width="8" height="18" fill="#EF4135" />
    </>
  ),
  // España — rojo / amarillo / rojo (horizontal)
  ES: (
    <>
      <rect width="24" height="18" fill="#AA151B" />
      <rect y="4.5" width="24" height="9" fill="#F1BF00" />
    </>
  ),
  // Reino Unido — Union Jack (aprox.)
  EN: (
    <>
      <rect width="24" height="18" fill="#012169" />
      <path d="M0,0 L24,18 M24,0 L0,18" stroke="#FFFFFF" strokeWidth="3.6" />
      <path d="M0,0 L24,18 M24,0 L0,18" stroke="#C8102E" strokeWidth="1.6" />
      <rect x="9" width="6" height="18" fill="#FFFFFF" />
      <rect y="6" width="24" height="6" fill="#FFFFFF" />
      <rect x="10" width="4" height="18" fill="#C8102E" />
      <rect y="7" width="24" height="4" fill="#C8102E" />
    </>
  ),
  // Alemania — negro / rojo / oro (horizontal)
  DE: (
    <>
      <rect width="24" height="6" fill="#000000" />
      <rect y="6" width="24" height="6" fill="#DD0000" />
      <rect y="12" width="24" height="6" fill="#FFCE00" />
    </>
  ),
};

export default function FlagIcon({ code, size = 18 }: { code: FlagCode; size?: number }) {
  const clipId = `flag-clip-${code}`;
  return (
    <svg
      width={size}
      height={(size * 3) / 4}
      viewBox="0 0 24 18"
      role="img"
      aria-label={code}
      style={{ display: "block", borderRadius: 2, flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}>
          <rect width="24" height="18" rx="2.5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>{FLAGS[code]}</g>
    </svg>
  );
}
