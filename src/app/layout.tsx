import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moda POC — Gemini 3.1 Flash Image",
  description: "Prova de conceito: geração de imagens de moda com IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
