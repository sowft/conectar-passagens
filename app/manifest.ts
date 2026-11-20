import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Conectar Passagens",
    short_name: "Conectar",
    description: "Campanhas, contatos e acompanhamento comercial da Conectar Passagens.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#9d1f16",
    icons: [
      { src: "/icons/app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/app-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
