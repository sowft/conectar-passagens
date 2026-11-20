-- Execute in the same Supabase project as supabase-leads.sql.
-- No client role can read credentials or issue/consume recovery links.
create table if not exists public.admin_access (
  id text primary key check (id = 'admin'),
  password_hash text,
  version uuid,
  token_hash text,
  token_expires timestamptz,
  requested_at timestamptz,
  changed_at timestamptz
);
alter table public.admin_access enable row level security;
revoke all on public.admin_access from public, anon, authenticated;
grant all on public.admin_access to service_role;

create or replace function public.request_admin_recovery(p_token_hash text)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_token_hash is null then return false; end if;
  insert into public.admin_access (id, token_hash, token_expires, requested_at)
  values ('admin', p_token_hash, now() + interval '30 minutes', now())
  on conflict (id) do update
    set token_hash = excluded.token_hash, token_expires = excluded.token_expires, requested_at = excluded.requested_at
    where admin_access.requested_at is null or admin_access.requested_at <= now() - interval '1 minute';
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

create or replace function public.consume_admin_recovery(p_token_hash text, p_password_hash text)
returns boolean language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' or p_token_hash is null or p_password_hash !~ '^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$' or p_password_hash is null then return false; end if;
  update public.admin_access
    set password_hash = p_password_hash, version = gen_random_uuid(),
        token_hash = null, token_expires = null, changed_at = now()
    where id = 'admin' and token_hash = p_token_hash and token_expires > now();
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;
revoke all on function public.request_admin_recovery(text) from public, anon, authenticated;
revoke all on function public.consume_admin_recovery(text, text) from public, anon, authenticated;
grant execute on function public.request_admin_recovery(text) to service_role;
grant execute on function public.consume_admin_recovery(text, text) to service_role;
