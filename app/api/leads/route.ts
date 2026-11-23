import { captureLead } from "@/lib/intake";
import { isAuthenticated } from "@/lib/session";
import { LeadStatus, statusOrder } from "@/lib/leads";
import { sessionDatabase } from "@/lib/session-database";
import { sharedSocialLeads, mergeVisibleLeads } from "@/lib/shared-social-leads";

// Cast in PostgreSQL before JSON serialization: preserve bigint precision and
// keep the same string ID contract for the prototype and newer UUID databases.
const leadColumns = "id::text,nome,telefone,origem,destino,data_viagem,fonte,status,observacoes,created_at,campaign_id,visit_id,consentimento_em";

type LeadPatch = {
  id?: string;
  status?: LeadStatus;
  observacoes?: string;
};

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && statusOrder.includes(value as LeadStatus);
}

function unauthorized() {
  return Response.json(
    { error: "Acesso restrito. Faca login para continuar." },
    { status: 401 },
  );
}

export async function GET() {
  if (!(await isAuthenticated())) return unauthorized();

  try {
  const { data, error } = await (await sessionDatabase())
    .from("leads")
    .select(leadColumns)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json(
      { error: "Nao foi possivel carregar os leads." },
      { status: 500 },
    );
  }

  const shared = await sharedSocialLeads();
  return Response.json({ leads: mergeVisibleLeads(data ?? [], shared) }, { headers: { "Cache-Control": "no-store, private" } });
  } catch { return Response.json({ error: "Configure o banco e a chave de servidor para carregar os leads." }, { status: 503 }); }
}

export async function POST(request: Request) {
  return captureLead(await request.json().catch(() => null));
}

export async function PATCH(request: Request) {
  if (!(await isAuthenticated())) return unauthorized();

  const body = (await request.json().catch(() => null)) as LeadPatch | null;
  if (!body) return Response.json({ error: "Dados invalidos." }, { status: 400 });

  if (!isText(body.id)) {
    return Response.json(
      { error: "Informe o id do lead para atualizar." },
      { status: 400 },
    );
  }

  const update: Partial<Pick<LeadPatch, "status" | "observacoes">> = {};

  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return Response.json(
        { error: "Informe um status valido para atualizar o lead." },
        { status: 400 },
      );
    }

    update.status = body.status;
  }

  if (body.observacoes !== undefined) {
    update.observacoes = String(body.observacoes).slice(0, 2000);
  }

  if (Object.keys(update).length === 0) {
    return Response.json(
      { error: "Informe ao menos um campo para atualizar." },
      { status: 400 },
    );
  }

  try {
  const { data, error } = await (await sessionDatabase())
    .from("leads")
    .update(update)
    .eq("id", body.id.trim())
    .select(leadColumns)
    .single();

  if (error) {
    return Response.json(
      { error: "Nao foi possivel atualizar o status do lead." },
      { status: 500 },
    );
  }

  return Response.json({ lead: data }, { headers: { "Cache-Control": "no-store, private" } });
  } catch { return Response.json({ error: "Nao foi possivel salvar no banco." }, { status: 503 }); }
}
