-- Fix account balances that were saved incorrectly
-- This converts balances that were saved as dollars to cents

-- First, let's see the current balances
SELECT id, name, balance, balance * 100 as corrected_balance 
FROM accounts 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Update balances: multiply by 100 to convert dollars to cents
-- Only update if balance is less than 1000 (assuming no one has $10+ accounts that were saved correctly)
UPDATE accounts 
SET balance = balance * 100, 
    updated_at = NOW()
WHERE user_id = '00000000-0000-0000-0000-000000000001' 
  AND balance < 1000  -- Only fix small balances that are likely in dollars
  AND balance > 0;    -- Don't touch zero balances

-- Verify the fix
SELECT id, name, balance, balance / 100.0 as balance_in_dollars 
FROM accounts 
WHERE user_id = '00000000-0000-0000-0000-000000000001';
