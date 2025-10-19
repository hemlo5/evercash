-- Add goals table to database
-- Run this in your Supabase Dashboard → SQL Editor

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

-- Add comment
COMMENT ON TABLE goals IS 'User savings goals and targets';
