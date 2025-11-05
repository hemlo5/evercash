-- Identity unification: move domain FKs to auth.users(id), remap existing rows by email, refresh reporting view, add indexes

-- Remap legacy rows to the correct auth.users.id by matching email (case-insensitive)
with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.accounts a set user_id = m.new_id from mapping m where a.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.categories c set user_id = m.new_id from mapping m where c.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.payees p set user_id = m.new_id from mapping m where p.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.goals g set user_id = m.new_id from mapping m where g.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.budget b set user_id = m.new_id from mapping m where b.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.import_rules r set user_id = m.new_id from mapping m where r.user_id = m.old_id;

with mapping as (
  select u.id as old_id, au.id as new_id
  from public.users u
  join auth.users au on lower(u.email) = lower(au.email)
  where u.id <> au.id
)
update public.transactions t set user_id = m.new_id from mapping m where t.user_id = m.old_id;

-- Retarget foreign keys to auth.users(id)
alter table if exists public.accounts drop constraint if exists accounts_user_id_fkey;
alter table if exists public.accounts add constraint accounts_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.categories drop constraint if exists categories_user_id_fkey;
alter table if exists public.categories add constraint categories_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.payees drop constraint if exists payees_user_id_fkey;
alter table if exists public.payees add constraint payees_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.transactions drop constraint if exists transactions_user_id_fkey;
alter table if exists public.transactions add constraint transactions_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.budget drop constraint if exists budget_user_id_fkey;
alter table if exists public.budget add constraint budget_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.goals drop constraint if exists goals_user_id_fkey;
alter table if exists public.goals add constraint goals_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table if exists public.import_rules drop constraint if exists import_rules_user_id_fkey;
alter table if exists public.import_rules add constraint import_rules_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

-- Refresh admin view to prefer user_profiles/auth.users email and keep varchar(255)
drop view if exists public.transactions_with_email;
create view public.transactions_with_email as
select
  t.*,
  coalesce(
    up.email::varchar(255),
    au.email::varchar(255)
  ) as email
from public.transactions t
left join public.user_profiles up on up.id = t.user_id
left join auth.users au on au.id = t.user_id;

-- Performance indexes
create index if not exists idx_transactions_user_date on public.transactions(user_id, date desc);
create index if not exists idx_transactions_user_created on public.transactions(user_id, created_at desc);
create index if not exists idx_categories_user_name on public.categories(user_id, name);
create index if not exists idx_payees_user_name on public.payees(user_id, name);
create index if not exists idx_goals_user on public.goals(user_id);
create index if not exists idx_budget_user_month on public.budget(user_id, month);
create index if not exists idx_accounts_user on public.accounts(user_id);
create index if not exists idx_import_rules_user on public.import_rules(user_id);
