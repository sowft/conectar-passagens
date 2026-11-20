"use client";

import { useState } from "react";

const inputClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#9d1f16] focus:ring-2 focus:ring-[#f3c400]/40";

export default function LeadForm() {
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [origem, setOrigem] = useState("");
  const [destino, setDestino] = useState("");
  const [perfil, setPerfil] = useState("Compra urgente");
  const [savedLead, setSavedLead] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavedLead(`${nome} - ${origem} para ${destino} - ${perfil}`);
    setNome("");
    setWhatsapp("");
    setOrigem("");
    setDestino("");
    setPerfil("Compra urgente");
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9d1f16]">
          Nova oportunidade
        </p>
        <h2 className="mt-1 text-xl font-bold text-zinc-950">
          Captar cliente interessado
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Registre o contato, a rota desejada e o perfil de atendimento.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        <label className="grid gap-1 text-sm font-semibold text-zinc-800">
          Nome do contato
          <input
            type="text"
            placeholder="Ex.: Maria Souza"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputClass}
            required
          />
        </label>

        <label className="grid gap-1 text-sm font-semibold text-zinc-800">
          WhatsApp
          <input
            type="tel"
            placeholder="(27) 99999-0000"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            className={inputClass}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-zinc-800">
            Origem
            <input
              type="text"
              placeholder="Vitoria"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-semibold text-zinc-800">
            Destino
            <input
              type="text"
              placeholder="Sao Paulo"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className={inputClass}
              required
            />
          </label>
        </div>

        <label className="grid gap-1 text-sm font-semibold text-zinc-800">
          Perfil do cliente
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className={inputClass}
          >
            <option>Compra urgente</option>
            <option>Empresa com viagem recorrente</option>
            <option>Familia planejando viagem</option>
            <option>Cliente pesquisando preco</option>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-md bg-[#9d1f16] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white shadow-sm transition hover:bg-[#7f190f]"
        >
          Registrar solicitação
        </button>
      </form>

      {savedLead ? (
        <p className="mt-4 rounded-md border border-[#f3c400] bg-[#fff8cc] px-3 py-2 text-sm font-semibold text-[#4b3200]">
          Oportunidade registrada: {savedLead}
        </p>
      ) : null}
    </section>
  );
}
