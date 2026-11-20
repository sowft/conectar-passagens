create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  origem text not null,
  destino text not null,
  data_viagem date,
  fonte text not null default 'Landing Page',
  status text not null default 'novo' check (status in ('novo', 'qualificado', 'contatado', 'convertido')),
  observacoes text,
  created_at timestamptz not null default now()
);

alter table public.leads
add column if not exists observacoes text;

alter table public.leads enable row level security;


-- Remove public access introduced by the prototype. Browser uses server APIs only.
drop policy if exists "Permitir cadastro publico de leads" on public.leads;
drop policy if exists "Permitir leitura anonima de leads" on public.leads;
drop policy if exists "Permitir atualizacao anonima de status" on public.leads;
revoke all on public.leads from anon, authenticated;

create table if not exists public.usuarios (
 id uuid primary key default gen_random_uuid(), nome text not null,
 email text not null unique, password_hash text not null,
 created_at timestamptz not null default now()
);
alter table public.usuarios enable row level security;
drop policy if exists "Permitir cadastro publico de usuarios" on public.usuarios;
drop policy if exists "Permitir login por email" on public.usuarios;
revoke all on public.usuarios from anon, authenticated;

create table if not exists public.campaigns (
 id uuid primary key default gen_random_uuid(),
 nome text not null, produto text not null, publico text not null,
 regiao text not null, perfil text not null, canais text[] not null,
 status text not null default 'ativa' check (status in ('ativa', 'pausada')),
 created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon, authenticated;
grant all on public.campaigns, public.leads, public.usuarios to service_role;
alter table public.leads add column if not exists campaign_id uuid references public.campaigns(id);
alter table public.leads add column if not exists consentimento_em timestamptz;
create index if not exists leads_campaign_idx on public.leads(campaign_id);

-- Entradas pelos links /r e encaminhamentos para compra. Nao representam vendas.
create table if not exists public.campaign_visits (
 id uuid primary key default gen_random_uuid(),
 campaign_id uuid not null references public.campaigns(id),
 fonte text not null,
 created_at timestamptz not null default now()
);
create index if not exists campaign_visits_campaign_idx on public.campaign_visits(campaign_id);
create table if not exists public.purchase_clicks (
 visit_id uuid primary key references public.campaign_visits(id),
 created_at timestamptz not null default now()
);
alter table public.leads add column if not exists visit_id uuid references public.campaign_visits(id);
create index if not exists leads_visit_idx on public.leads(visit_id);
alter table public.campaign_visits enable row level security;
alter table public.purchase_clicks enable row level security;
revoke all on public.campaign_visits, public.purchase_clicks from anon, authenticated;
grant all on public.campaign_visits, public.purchase_clicks to service_role;

create or replace function public.campaign_metrics()
returns table (campaign_id uuid, fonte text, entradas bigint, encaminhamentos bigint)
language sql stable security invoker set search_path = public as $$
 select v.campaign_id, v.fonte, count(*) as entradas, count(p.visit_id) as encaminhamentos
 from public.campaign_visits v
 left join public.purchase_clicks p on p.visit_id = v.id
 group by v.campaign_id, v.fonte;
$$;
revoke all on function public.campaign_metrics() from public, anon, authenticated;
grant execute on function public.campaign_metrics() to service_role;
