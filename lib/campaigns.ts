export type Campaign = {
  id: string;
  nome: string;
  produto: string;
  publico: string;
  regiao: string;
  perfil: string;
  canais: string[];
  status: "ativa" | "pausada";
  created_at: string;
};
