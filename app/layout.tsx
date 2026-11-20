import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  appleWebApp: { capable: true, title: "Conectar", statusBarStyle: "default" },
  icons: { icon: "/icons/app-192.png", apple: "/icons/apple-touch-icon.png" },
  title: "Conectar Passagens | Central de Prospecção",
  description: "Central de prospecção, captação e acompanhamento de oportunidades para venda de passagens.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#9d1f16" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><RegisterServiceWorker>{children}</RegisterServiceWorker></body>
    </html>
  );
}
