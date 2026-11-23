import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd(), true);
const env = process.env;
let pending = false;
function report(label, ok, detail) {
  console.log(`${ok ? 'OK' : 'PENDENTE'} - ${label}${detail ? ': ' + detail : ''}`);
  if (!ok) pending = true;
}
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
report('Endereco do Supabase', Boolean(url));
report('Chave privada do Supabase', Boolean(key), key ? 'configurada; valor oculto' : 'execute npm run configurar');
report('Senha administrativa', Boolean((env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 12) || /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(env.ADMIN_PASSWORD_HASH || '')));
report('Assinatura das sessoes', Boolean(env.SESSION_SECRET && env.SESSION_SECRET.length >= 32));
let publicUrl = false;
const publicAddress = env.PUBLIC_APP_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : env.VERCEL_URL ? `https://${env.VERCEL_URL}` : '');
try { const parsed = new URL(publicAddress); publicUrl = parsed.protocol === 'https:' && parsed.hostname !== 'localhost' && !parsed.hostname.endsWith('.localhost') && !parsed.username && !parsed.password; } catch {}
report('Endereco publico HTTPS', publicUrl, publicUrl ? `endereco reconhecido: ${new URL(publicAddress).origin}` : 'configure PUBLIC_APP_URL na hospedagem; disponibilidade externa precisa de teste real');
report('Busca Google', Boolean(env.GOOGLE_PLACES_API_KEY), env.GOOGLE_PLACES_API_KEY ? 'chave presente; uma busca real ainda precisa validar a API e a cota' : 'falta GOOGLE_PLACES_API_KEY');
if (url && key) {
  try {
    const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }) } });
    for (const [table, fields] of [['leads', 'id,campaign_id,visit_id,consentimento_em,observacoes'], ['campaigns', 'id,nome,canais,status'], ['usuarios', 'id,email,password_hash'], ['campaign_visits', 'id,campaign_id,fonte'], ['purchase_clicks', 'visit_id']]) {
      const { error } = await db.from(table).select(fields).limit(0);
      report(`Tabela ${table}`, !error, error ? `falha ${error.code || 'de conexao'}; confira a chave e execute supabase-leads.sql` : 'estrutura acessivel; nenhum registro lido');
    }
    const { error } = await db.rpc('campaign_metrics');
    report('Consulta de metricas', !error, error ? 'aplique supabase-leads.sql' : 'acessivel');
  } catch { report('Conexao com o Supabase', false, 'confira URL, chave e acesso a internet'); }
} else {
  report('Estrutura do banco', false, 'nao verificada sem as credenciais');
}
console.log('Nenhuma chave ou dado de cliente foi exibido. Este diagnostico nao publica o app nem confirma compras.');
process.exitCode = pending ? 1 : 0;
