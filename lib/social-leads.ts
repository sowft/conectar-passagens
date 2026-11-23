export function socialPostUrl(value: unknown) {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.replace(/^www\./, "");
    const facebook = host === "facebook.com" && /^\/groups\/\d+\/posts\/\d+\/?$/.test(url.pathname);
    const instagram = host === "instagram.com" && /^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
    if (!facebook && !instagram) return null;
    return `https://www.${host}${url.pathname.replace(/\/$/, "")}`;
  } catch { return null; }
}

export function leadPostUrl(notes: string | null) {
  const match = notes?.match(/^Publicacao: (https:\/\/[^\s]+)$/m);
  return socialPostUrl(match?.[1]);
}
