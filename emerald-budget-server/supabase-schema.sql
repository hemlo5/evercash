-- Emerald Budget Database Schema for Supabase
-- Run this SQL in your Supabase dashboard under SQL Editor

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'checking',
  balance BIGINT DEFAULT 0, -- Store in cents
  closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cat_group VARCHAR(255),
  is_income BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  budget_amount BIGINT DEFAULT 0, -- Budget amount in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payees table
CREATE TABLE IF NOT EXISTS payees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  amount BIGINT DEFAULT 0, -- Budget amount in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount BIGINT NOT NULL, -- Target amount in cents
  current_amount BIGINT DEFAULT 0, -- Current saved amount in cents
  target_months INTEGER DEFAULT 12, -- Timeline in months
  icon VARCHAR(50) DEFAULT 'target', -- Icon identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  payee_id UUID REFERENCES payees(id) ON DELETE SET NULL,
  amount BIGINT NOT NULL, -- Store in cents
  date DATE NOT NULL,
  notes TEXT,
  cleared BOOLEAN DEFAULT FALSE,
  imported BOOLEAN DEFAULT FALSE,
  transfer_id UUID, -- For transfers between accounts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget table
CREATE TABLE IF NOT EXISTS budget (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- First day of the month
  budgeted BIGINT DEFAULT 0, -- Store in cents
  activity BIGINT DEFAULT 0, -- Store in cents
  balance BIGINT DEFAULT 0, -- Store in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
);

-- Import rules table
CREATE TABLE IF NOT EXISTS import_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount BIGINT NOT NULL, -- Store in cents
  target_date DATE,
  current_amount BIGINT DEFAULT 0, -- Store in cents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_user_id ON budget(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_month ON budget(month);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (true);
CREATE POLICY "Users can insert own accounts" ON accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own accounts" ON accounts FOR UPDATE USING (true);
CREATE POLICY "Users can delete own accounts" ON accounts FOR DELETE USING (true);

CREATE POLICY "Users can view own categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Users can insert own categories" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own categories" ON categories FOR UPDATE USING (true);
CREATE POLICY "Users can delete own categories" ON categories FOR DELETE USING (true);

CREATE POLICY "Users can view own payees" ON payees FOR SELECT USING (true);
CREATE POLICY "Users can insert own payees" ON payees FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own payees" ON payees FOR UPDATE USING (true);
CREATE POLICY "Users can delete own payees" ON payees FOR DELETE USING (true);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Users can insert own transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Users can delete own transactions" ON transactions FOR DELETE USING (true);

CREATE POLICY "Users can view own budget" ON budget FOR SELECT USING (true);
CREATE POLICY "Users can insert own budget" ON budget FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own budget" ON budget FOR UPDATE USING (true);
CREATE POLICY "Users can delete own budget" ON budget FOR DELETE USING (true);

CREATE POLICY "Users can view own import_rules" ON import_rules FOR SELECT USING (true);
CREATE POLICY "Users can insert own import_rules" ON import_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own import_rules" ON import_rules FOR UPDATE USING (true);
CREATE POLICY "Users can delete own import_rules" ON import_rules FOR DELETE USING (true);

CREATE POLICY "Users can view own goals" ON goals FOR SELECT USING (true);
CREATE POLICY "Users can insert own goals" ON goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own goals" ON goals FOR UPDATE USING (true);
CREATE POLICY "Users can delete own goals" ON goals FOR DELETE USING (true);
