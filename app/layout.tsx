import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Asistente · Tu Empresa",
  description: "Chatbot de atención entrenado con la web de la empresa.",
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
