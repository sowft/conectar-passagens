import { isAuthenticated } from "@/lib/session";
export async function POST(request: Request) {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para pesquisar." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.segmento !== "string" || typeof body.regiao !== "string" || !body.segmento.trim() || !body.regiao.trim() || body.segmento.length > 100 || body.regiao.length > 100) return Response.json({ error: "Informe segmento e cidade ou regiao." }, { status: 400 });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return Response.json({ error: "Busca ainda nao ativada. Configure GOOGLE_PLACES_API_KEY no servidor. Voce tambem pode abrir a busca no Google Maps." }, { status: 503 });
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.nationalPhoneNumber,places.websiteUri,places.attributions" },
      body: JSON.stringify({ textQuery: `${body.segmento.trim()} em ${body.regiao.trim()}`, languageCode: "pt-BR", regionCode: "BR", pageSize: 10 }),
    });
    if (!response.ok) return Response.json({ error: "O Google nao concluiu a busca. Confira a ativacao da Places API, a chave e a cota no Google Cloud." }, { status: 502 });
    const data = await response.json();
    return Response.json({ places: data.places ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "A pesquisa demorou ou a conexao falhou. Tente novamente." }, { status: 502 }); }
}
