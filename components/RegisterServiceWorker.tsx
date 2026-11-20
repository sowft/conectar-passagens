"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
const InstallContext = createContext<{ prompt: InstallPrompt | null; clearPrompt: () => void }>({ prompt: null, clearPrompt: () => {} });
export function useInstallPrompt() { return useContext(InstallContext); }

export default function RegisterServiceWorker({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const installed = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", installed);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Installation remains optional; a registration failure must not block access.
      });
    }
    return () => { window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", installed); };
  }, []);
  return <InstallContext.Provider value={{ prompt, clearPrompt: () => setPrompt(null) }}>{children}</InstallContext.Provider>;
}
