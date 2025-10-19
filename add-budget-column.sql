-- Add budget_amount column to existing categories table
-- Run this in your Supabase Dashboard → SQL Editor

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS budget_amount BIGINT DEFAULT 0;

-- Add comment
COMMENT ON COLUMN categories.budget_amount IS 'Budget amount in cents';
