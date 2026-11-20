import { sessionCookie } from "@/lib/session";
import { hashPassword, normalizeEmail } from "@/lib/auth";
import { findLocalUser } from "@/lib/local-users";
import { database } from "@/lib/server-db";
import { hasAdminPassword, verifyAdminPassword } from "@/lib/admin-password";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.password !== "string" || (body.email !== undefined && typeof body.email !== "string") || body.password.length > 256) {
    return Response.json(
      { error: "Informe a senha." },
      { status: 400 },
    );
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32 || (!hasAdminPassword() && !process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) return Response.json({ error: "O acesso ainda nao foi configurado. Neste computador, abra Configurar acesso local para criar sua senha." }, { status: 503 });

  // The administrator is identified by its password; browser autofill may supply an email.
  if (verifyAdminPassword(body.password)) {
    return authenticatedResponse(Boolean(body.remember));
  }

  if (!body.email || (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return Response.json(
      { error: "Senha invalida." },
      { status: 401 },
    );
  }

  const email = normalizeEmail(body.email);
  const passwordHash = hashPassword(email, body.password);
  try {
  const { data, error } = await database()
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .eq("password_hash", passwordHash)
    .maybeSingle();

  if (error || !data) {
    const localUser = await findLocalUser(email, passwordHash);

    if (localUser) {
      return authenticatedResponse(Boolean(body.remember));
    }

    return Response.json(
      { error: "E-mail ou senha invalidos." },
      { status: 401 },
    );
  }

  return authenticatedResponse(Boolean(body.remember));
  } catch { return Response.json({ error: "Acesso indisponivel. Confira a configuracao do servidor." }, { status: 503 }); }
}

function authenticatedResponse(remember: boolean) {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": sessionCookie(remember),
      },
    },
  );
}
