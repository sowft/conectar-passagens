export async function POST() {
  return Response.json({ error: "O cadastro publico da area interna esta desativado. Solicite acesso ao administrador." }, { status: 403 });
}
