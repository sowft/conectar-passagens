import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  title: "Conectar Passagens | Central de Prospecção",
  description: "Central de prospecção, captação e acompanhamento de oportunidades para venda de passagens.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
