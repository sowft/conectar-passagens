import { configureLocalAdmin, localSetupAllowed, setupAvailable } from "@/lib/local-setup";

export async function GET(request: Request) {
  if (!localSetupAllowed(request)) return new Response(null, { status: 404 });
  try { return Response.json({ available: await setupAvailable() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Nao foi possivel verificar a configuracao local." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!localSetupAllowed(request)) return new Response(null, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256) return Response.json({ error: "Escolha uma senha entre 12 e 256 caracteres." }, { status: 400 });
  try {
    await configureLocalAdmin(body.password);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if ((error as Error).message === "ALREADY_CONFIGURED") return Response.json({ error: "O administrador ja foi configurado. Volte para entrar." }, { status: 409 });
    return Response.json({ error: "Nao foi possivel salvar. Verifique a permissao da pasta ou use npm run configurar no terminal." }, { status: 503 });
  }
}
