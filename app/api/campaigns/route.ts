import { isAuthenticated } from "@/lib/session";
import { sessionDatabase } from "@/lib/session-database";

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  try {
    const { data, error } = await (await sessionDatabase()).from("campaigns").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return Response.json({ campaigns: data }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return Response.json({ error: "Campanhas indisponiveis. Confira a configuracao do servidor e execute a migracao SQL." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !["produto", "publico", "regiao", "perfil"].every(key => typeof body[key] === "string" && body[key].trim().length > 0 && body[key].length <= 160) || !Array.isArray(body.canais) || !body.canais.length || body.canais.length > 8 || !body.canais.every((c: unknown) => typeof c === "string" && c.length <= 80)) {
    return Response.json({ error: "Preencha o publico, a regiao e ao menos um canal." }, { status: 400 });
  }
  try {
    const { data, error } = await (await sessionDatabase()).from("campaigns").insert({ nome: `${body.produto} — ${body.regiao}`, produto: body.produto, publico: body.publico, regiao: body.regiao, perfil: body.perfil, canais: body.canais }).select().single();
    if (error) throw error;
    return Response.json({ campaign: data }, { status: 201 });
  } catch {
    return Response.json({ error: "Nao foi possivel salvar. Confira a configuracao e a migracao SQL." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !["ativa", "pausada"].includes(body.status)) return Response.json({ error: "Campanha invalida." }, { status: 400 });
  try {
    const { data, error } = await (await sessionDatabase()).from("campaigns").update({ status: body.status }).eq("id", body.id).select().single();
    if (error) throw error;
    return Response.json({ campaign: data });
  } catch {
    return Response.json({ error: "Nao foi possivel atualizar a campanha." }, { status: 503 });
  }
}
