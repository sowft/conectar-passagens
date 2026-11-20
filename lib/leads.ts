export type LeadStatus = "novo" | "qualificado" | "contatado" | "convertido";

export type Lead = {
  id: string;
  campaign_id?: string | null;
  nome: string;
  telefone: string;
  origem: string;
  destino: string;
  data_viagem: string | null;
  fonte: string;
  status: LeadStatus;
  observacoes: string | null;
  created_at: string;
};

export type LeadInsert = {
  attribution_token?: string | null;
  campaign_id?: string | null;
  consentimento?: boolean;
  nome: string;
  telefone: string;
  origem: string;
  destino: string;
  data_viagem: string;
  fonte: string;
  status: LeadStatus;
};

export const statusLabels: Record<LeadStatus, string> = {
  novo: "Novo",
  qualificado: "Qualificado",
  contatado: "Contatado",
  convertido: "Convertido",
};

export const statusOrder: LeadStatus[] = [
  "novo",
  "qualificado",
  "contatado",
  "convertido",
];

export function formatDate(value: string | null) {
  if (!value) return "Data a confirmar";

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;

  return `${day}/${month}/${year}`;
}

export function formatRelativeDate(value: string) {
  const created = new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - created) / 60000));

  if (diffMinutes < 1) return "agora";
  if (diffMinutes < 60) return `ha ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `ha ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  return `ha ${diffDays} d`;
}

export function whatsAppUrl(lead: Lead) {
  const phone = lead.telefone.replace(/\D/g, "");
  const normalizedPhone = phone.startsWith("55") ? phone : `55${phone}`;
  const message = `Ola, ${lead.nome}! Recebemos seu interesse em passagem de ${lead.origem} para ${lead.destino}. Posso te ajudar com horarios e valores? Voce tambem pode consultar e comprar em https://www.clickbus.com.br/viacao/itapemirim`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export const purchaseUrl = "https://www.clickbus.com.br/viacao/itapemirim";
