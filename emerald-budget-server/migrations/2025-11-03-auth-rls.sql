-- Migration: Strengthen RLS to per-user (auth.uid()) and prepare for Supabase Auth end-to-end
-- Safe to run multiple times

-- 1) Ensure user_id columns are NOT NULL where appropriate
alter table if exists accounts alter column user_id set not null;
alter table if exists categories alter column user_id set not null;
alter table if exists payees alter column user_id set not null;
alter table if exists transactions alter column user_id set not null;
alter table if exists budget alter column user_id set not null;
alter table if exists goals alter column user_id set not null;
alter table if exists import_rules alter column user_id set not null;

-- 2) Ensure FKs exist to users(id) (legacy mirror table). If already exist, these will no-op or error benignly.
alter table if exists accounts
  drop constraint if exists accounts_user_id_fkey,
  add constraint accounts_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists categories
  drop constraint if exists categories_user_id_fkey,
  add constraint categories_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists payees
  drop constraint if exists payees_user_id_fkey,
  add constraint payees_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists transactions
  drop constraint if exists transactions_user_id_fkey,
  add constraint transactions_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists budget
  drop constraint if exists budget_user_id_fkey,
  add constraint budget_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists goals
  drop constraint if exists goals_user_id_fkey,
  add constraint goals_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

alter table if exists import_rules
  drop constraint if exists import_rules_user_id_fkey,
  add constraint import_rules_user_id_fkey foreign key (user_id) references users(id) on delete cascade;

-- 3) Enable Row Level Security
alter table if exists users enable row level security;
alter table if exists accounts enable row level security;
alter table if exists categories enable row level security;
alter table if exists payees enable row level security;
alter table if exists transactions enable row level security;
alter table if exists budget enable row level security;
alter table if exists goals enable row level security;
alter table if exists import_rules enable row level security;

-- 4) Drop permissive policies if they exist (ignore errors)
-- Users
drop policy if exists "Users can view own data" on users;
drop policy if exists "Users can update own data" on users;
drop policy if exists "Users can insert own data" on users;

-- Accounts
drop policy if exists "Users can view own accounts" on accounts;
drop policy if exists "Users can insert own accounts" on accounts;
drop policy if exists "Users can update own accounts" on accounts;
drop policy if exists "Users can delete own accounts" on accounts;

-- Categories
drop policy if exists "Users can view own categories" on categories;
drop policy if exists "Users can insert own categories" on categories;
drop policy if exists "Users can update own categories" on categories;
drop policy if exists "Users can delete own categories" on categories;

-- Payees
drop policy if exists "Users can view own payees" on payees;
drop policy if exists "Users can insert own payees" on payees;
drop policy if exists "Users can update own payees" on payees;
drop policy if exists "Users can delete own payees" on payees;

-- Transactions
drop policy if exists "Users can view own transactions" on transactions;
drop policy if exists "Users can insert own transactions" on transactions;
drop policy if exists "Users can update own transactions" on transactions;
drop policy if exists "Users can delete own transactions" on transactions;

-- Budget
drop policy if exists "Users can view own budget" on budget;
drop policy if exists "Users can insert own budget" on budget;
drop policy if exists "Users can update own budget" on budget;
drop policy if exists "Users can delete own budget" on budget;

-- Import Rules
drop policy if exists "Users can view own import_rules" on import_rules;
drop policy if exists "Users can insert own import_rules" on import_rules;
drop policy if exists "Users can update own import_rules" on import_rules;
drop policy if exists "Users can delete own import_rules" on import_rules;

-- Goals
drop policy if exists "Users can view own goals" on goals;
drop policy if exists "Users can insert own goals" on goals;
drop policy if exists "Users can update own goals" on goals;
drop policy if exists "Users can delete own goals" on goals;

-- 5) Create strict policies based on auth.uid()
-- Users table: a logged-in user can see/insert/update only their own row (id must equal auth.uid())
drop policy if exists users_select_own on users;
create policy users_select_own on users for select using (id = auth.uid());
drop policy if exists users_insert_own on users;
create policy users_insert_own on users for insert with check (id = auth.uid());
drop policy if exists users_update_own on users;
create policy users_update_own on users for update using (id = auth.uid()) with check (id = auth.uid());

-- Domain tables with user_id
drop policy if exists accounts_select_own on accounts;
create policy accounts_select_own on accounts for select using (user_id = auth.uid());
drop policy if exists accounts_insert_own on accounts;
create policy accounts_insert_own on accounts for insert with check (user_id = auth.uid());
drop policy if exists accounts_update_own on accounts;
create policy accounts_update_own on accounts for update using (user_id = auth.uid());
drop policy if exists accounts_delete_own on accounts;
create policy accounts_delete_own on accounts for delete using (user_id = auth.uid());

drop policy if exists categories_select_own on categories;
create policy categories_select_own on categories for select using (user_id = auth.uid());
drop policy if exists categories_insert_own on categories;
create policy categories_insert_own on categories for insert with check (user_id = auth.uid());
drop policy if exists categories_update_own on categories;
create policy categories_update_own on categories for update using (user_id = auth.uid());
drop policy if exists categories_delete_own on categories;
create policy categories_delete_own on categories for delete using (user_id = auth.uid());

drop policy if exists payees_select_own on payees;
create policy payees_select_own on payees for select using (user_id = auth.uid());
drop policy if exists payees_insert_own on payees;
create policy payees_insert_own on payees for insert with check (user_id = auth.uid());
drop policy if exists payees_update_own on payees;
create policy payees_update_own on payees for update using (user_id = auth.uid());
drop policy if exists payees_delete_own on payees;
create policy payees_delete_own on payees for delete using (user_id = auth.uid());

drop policy if exists transactions_select_own on transactions;
create policy transactions_select_own on transactions for select using (user_id = auth.uid());
drop policy if exists transactions_insert_own on transactions;
create policy transactions_insert_own on transactions for insert with check (user_id = auth.uid());
drop policy if exists transactions_update_own on transactions;
create policy transactions_update_own on transactions for update using (user_id = auth.uid());
drop policy if exists transactions_delete_own on transactions;
create policy transactions_delete_own on transactions for delete using (user_id = auth.uid());

drop policy if exists budget_select_own on budget;
create policy budget_select_own on budget for select using (user_id = auth.uid());
drop policy if exists budget_insert_own on budget;
create policy budget_insert_own on budget for insert with check (user_id = auth.uid());
drop policy if exists budget_update_own on budget;
create policy budget_update_own on budget for update using (user_id = auth.uid());
drop policy if exists budget_delete_own on budget;
create policy budget_delete_own on budget for delete using (user_id = auth.uid());

drop policy if exists goals_select_own on goals;
create policy goals_select_own on goals for select using (user_id = auth.uid());
drop policy if exists goals_insert_own on goals;
create policy goals_insert_own on goals for insert with check (user_id = auth.uid());
drop policy if exists goals_update_own on goals;
create policy goals_update_own on goals for update using (user_id = auth.uid());
drop policy if exists goals_delete_own on goals;
create policy goals_delete_own on goals for delete using (user_id = auth.uid());

drop policy if exists import_rules_select_own on import_rules;
create policy import_rules_select_own on import_rules for select using (user_id = auth.uid());
drop policy if exists import_rules_insert_own on import_rules;
create policy import_rules_insert_own on import_rules for insert with check (user_id = auth.uid());
drop policy if exists import_rules_update_own on import_rules;
create policy import_rules_update_own on import_rules for update using (user_id = auth.uid());
drop policy if exists import_rules_delete_own on import_rules;
create policy import_rules_delete_own on import_rules for delete using (user_id = auth.uid());

-- 6) Optional admin view (requires service role or admin access)
create or replace view public.transactions_with_email as
select t.*, u.email
from transactions t
join users u on u.id = t.user_id;

-- Indexes for performance (if not present)
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_date on transactions(date);
create index if not exists idx_accounts_user_id on accounts(user_id);
create index if not exists idx_categories_user_id on categories(user_id);
create index if not exists idx_budget_user_id on budget(user_id);
create index if not exists idx_budget_month on budget(month);
