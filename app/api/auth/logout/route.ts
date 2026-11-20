export async function POST() {
  return Response.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": [
          "conectar_admin=",
          "Path=/",
          "HttpOnly",
          "SameSite=Lax",
          "Max-Age=0",
        ].join("; "),
      },
    },
  );
}
