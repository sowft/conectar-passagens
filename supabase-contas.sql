-- Run AFTER supabase-leads.sql in the same Supabase project.
-- Public signups get their own workspace; existing ownerless data stays admin-only.
begin;
-- Add it without a default first: old campaigns must stay unowned even if the
-- SQL runner happens to have an auth.uid() in its current database session.
alter table public.campaigns add column if not exists owner_id uuid references auth.users(id);
alter table public.campaigns alter column owner_id set default auth.uid();
create index if not exists campaigns_owner_idx on public.campaigns(owner_id);

drop policy if exists "campaigns_own_read" on public.campaigns;
drop policy if exists "campaigns_own_insert" on public.campaigns;
drop policy if exists "campaigns_own_update" on public.campaigns;
create policy "campaigns_own_read" on public.campaigns for select to authenticated using (owner_id = (select auth.uid()));
create policy "campaigns_own_insert" on public.campaigns for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "campaigns_own_update" on public.campaigns for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke all on public.campaigns from authenticated;
grant select, insert on public.campaigns to authenticated;
grant update (status) on public.campaigns to authenticated;

drop policy if exists "leads_own_read" on public.leads;
drop policy if exists "leads_own_update" on public.leads;
create policy "leads_own_read" on public.leads for select to authenticated using (exists (select 1 from public.campaigns c where c.id = leads.campaign_id and c.owner_id = (select auth.uid())));
create policy "leads_own_update" on public.leads for update to authenticated using (exists (select 1 from public.campaigns c where c.id = leads.campaign_id and c.owner_id = (select auth.uid()))) with check (exists (select 1 from public.campaigns c where c.id = leads.campaign_id and c.owner_id = (select auth.uid())));
revoke all on public.leads from authenticated;
grant select on public.leads to authenticated;
grant update (status, observacoes) on public.leads to authenticated;

drop policy if exists "visits_own_read" on public.campaign_visits;
create policy "visits_own_read" on public.campaign_visits for select to authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_visits.campaign_id and c.owner_id = (select auth.uid())));
drop policy if exists "clicks_own_read" on public.purchase_clicks;
create policy "clicks_own_read" on public.purchase_clicks for select to authenticated using (exists (select 1 from public.campaign_visits v join public.campaigns c on c.id = v.campaign_id where v.id = purchase_clicks.visit_id and c.owner_id = (select auth.uid())));
grant select on public.campaign_visits, public.purchase_clicks to authenticated;
grant execute on function public.campaign_metrics() to authenticated;

-- All writes to public capture endpoints still go through validated server APIs.
-- No public signup receives access to usuarios, admin_access or the service key.
notify pgrst, 'reload schema';
commit;
