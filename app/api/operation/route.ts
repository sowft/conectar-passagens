import { isAuthenticated } from "@/lib/session";
import { database } from "@/lib/server-db";

export async function GET() {
  if (!await isAuthenticated()) return Response.json({ error: "Entre para continuar." }, { status: 401 });
  const checks: { name: string; ok: boolean; detail: string }[] = [];
  const env = process.env;
  const configured = Boolean(env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY));
  checks.push({ name: "Banco de dados", ok: configured, detail: configured ? "Credenciais presentes; verificando estrutura abaixo." : "Crie o projeto Supabase e configure a URL e a chave privada." });
  checks.push({ name: "Acesso administrativo", ok: Boolean(((env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 12) || /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH ?? "")) && env.SESSION_SECRET && env.SESSION_SECRET.length >= 32), detail: "Exige senha de pelo menos 12 caracteres e assinatura de sessao configuradas." });
  let publicUrl = false;
  try { const url = new URL(env.PUBLIC_APP_URL ?? ""); publicUrl = url.protocol === "https:" && url.hostname !== "localhost"; } catch { /* Unconfigured */ }
  checks.push({ name: "Endereco publico", ok: publicUrl, detail: "Configure PUBLIC_APP_URL com o endereco HTTPS da hospedagem. A presenca do endereco nao comprova disponibilidade externa." });
  if (configured) {
    const tables = { leads: "id,visit_id,campaign_id,consentimento_em", campaigns: "id,canais,status", campaign_visits: "id,campaign_id,fonte", purchase_clicks: "visit_id" };
    await Promise.all(Object.entries(tables).map(async ([table, fields]) => {
      try {
        const { error } = await database().from(table).select(fields).limit(0).abortSignal(AbortSignal.timeout(8000));
        checks.push({ name: `Estrutura: ${table}`, ok: !error, detail: error ? "Falha de acesso ou estrutura; aplique supabase-leads.sql e confira as credenciais." : "Estrutura acessivel. Nenhum registro de cliente foi lido." });
      } catch { checks.push({ name: `Estrutura: ${table}`, ok: false, detail: "Falha de conexao ao banco." }); }
    }));
    try {
      const { error } = await database().rpc("campaign_metrics").abortSignal(AbortSignal.timeout(8000));
      checks.push({ name: "Metricas de campanhas", ok: !error, detail: error ? "Aplique a migracao de metricas no Supabase." : "Consulta de metricas acessivel." });
    } catch { checks.push({ name: "Metricas de campanhas", ok: false, detail: "Falha ao consultar metricas." }); }
  }
  return Response.json({ captureReady: checks.every(check => check.ok), checks, optional: [
    { name: "Pesquisa Google", detail: env.GOOGLE_PLACES_API_KEY ? "Chave presente; valide com uma pesquisa real." : "Nao configurada. A divulgacao manual dos links continua possivel." },
    { name: "Anuncios", detail: "Nenhum conector de publicacao de anuncios implementado. Os links podem ser divulgados manualmente." },
    { name: "Confirmacao de compra", detail: "Sem integracao de vendas com a ClickBus. Vendas no funil sao informadas pela equipe." },
  ] }, { headers: { "Cache-Control": "no-store" } });
}
