import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent de support basé sur l'IA",
  description: "Chatbot de service client pour les agences de voyages réceptives.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
