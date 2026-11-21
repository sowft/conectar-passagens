import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";

test("PostgreSQL isolates accounts, preserves legacy data and rejects cross-account writes", async () => {
  for (const legacy of [false, true]) {
    const db = new PGlite();
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    try {
      await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key);
        create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
        grant usage on schema auth to authenticated;
        insert into auth.users values ('${a}'),('${b}');`);
      if (legacy) await db.exec("create table public.leads(id bigint primary key generated always as identity,nome text,telefone text,origem text,destino text,created_at timestamp default now()); insert into public.leads(nome) values ('Contato antigo');");
      await db.exec(fs.readFileSync("supabase-leads.sql", "utf8"));
      await db.exec(`insert into public.campaigns(nome,produto,publico,regiao,perfil,canais) values ('Anterior a contas','Passagem','Pessoas','ES','Viagem',array['WhatsApp']); select set_config('request.jwt.claim.sub','${a}',false);`);
      for (let repeat = 0; repeat < 2; repeat++) {
        for (const file of ["supabase-leads.sql", "supabase-auth-recovery.sql", "supabase-contas.sql"]) await db.exec(fs.readFileSync(file, "utf8"));
      }
      assert.equal((await db.query("select owner_id from public.campaigns where nome='Anterior a contas'")).rows[0].owner_id, null);
      await db.exec("select set_config('request.jwt.claim.sub','',false);");
      const campaign = async (owner, name) => (await db.query("insert into public.campaigns(nome,produto,publico,regiao,perfil,canais,owner_id) values ($1,'Passagem','Pessoas','ES','Viagem',array['WhatsApp'],$2) returning id::text", [name, owner])).rows[0].id;
      const ca = await campaign(a, "Campanha A"); const cb = await campaign(b, "Campanha B"); const old = await campaign(null, "Campanha antiga");
      const lead = async id => (await db.query("insert into public.leads(nome,telefone,origem,destino,campaign_id) values ('Contato','27999999999','Vitoria','Rio',$1) returning id::text", [id])).rows[0].id;
      const la = await lead(ca); const lb = await lead(cb); await lead(old);
      const va = (await db.query("insert into public.campaign_visits(campaign_id,fonte) values ($1,'WhatsApp') returning id::text", [ca])).rows[0].id;
      const vb = (await db.query("insert into public.campaign_visits(campaign_id,fonte) values ($1,'WhatsApp') returning id::text", [cb])).rows[0].id;
      await db.query("insert into public.purchase_clicks(visit_id) values ($1),($2)", [va, vb]);
      await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`);
      assert.deepEqual((await db.query("select nome from public.campaigns")).rows, [{ nome: "Campanha A" }]);
      assert.deepEqual((await db.query("select id::text from public.leads")).rows, [{ id: la }]);
      assert.equal((await db.query("update public.leads set status='convertido' where id::text=$1 returning id::text", [lb])).rows.length, 0);
      assert.equal((await db.query("update public.leads set status='qualificado' where id::text=$1 returning id::text", [la])).rows.length, 1);
      await assert.rejects(() => db.query("update public.leads set campaign_id=$1 where id::text=$2", [cb, la]), /permission denied/);
      await assert.rejects(() => campaign(b, "Tentativa de outra conta"), /row-level security/);
      const owned = (await db.query("insert into public.campaigns(nome,produto,publico,regiao,perfil,canais) values ('Minha nova','Passagem','Pessoas','ES','Viagem',array['WhatsApp']) returning owner_id::text")).rows[0];
      assert.equal(owned.owner_id, a);
      await assert.rejects(() => db.query("update public.campaigns set owner_id=$1 where id=$2", [b, ca]), /permission denied/);
      await assert.rejects(() => db.query("select * from public.admin_access"), /permission denied/);
      await assert.rejects(() => db.query("select * from public.usuarios"), /permission denied/);
      assert.deepEqual((await db.query("select campaign_id::text from public.campaign_metrics()")).rows, [{ campaign_id: ca }]);
      await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
      assert.deepEqual((await db.query("select id::text from public.leads")).rows, [{ id: lb }]);
      assert.deepEqual((await db.query("select campaign_id::text from public.campaign_metrics()")).rows, [{ campaign_id: cb }]);
      await db.exec("reset role; set role anon;");
      await assert.rejects(() => db.query("select * from public.leads"), /permission denied/);
      await db.exec("reset role; set role service_role;");
      assert.equal((await db.query("select nome from public.campaigns where id=$1", [old])).rows[0].nome, "Campanha antiga");
      if (legacy) assert.equal((await db.query("select nome from public.leads where nome='Contato antigo'")).rows.length, 1);
    } finally { await db.close(); }
  }
});
