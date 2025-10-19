-- Create a demo user in Supabase for development
-- Run this in your Supabase SQL editor

-- First check if demo user exists
DO $$ 
BEGIN
    -- Insert demo user if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
        INSERT INTO users (id, email, password_hash, token, created_at, updated_at)
        VALUES (
            '00000000-0000-0000-0000-000000000001',
            'demo@example.com',
            '$2a$10$dummy.hash.for.demo.user', -- This is not a real password hash
            'demo-token',
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Demo user created successfully';
    ELSE
        RAISE NOTICE 'Demo user already exists';
    END IF;
END $$;

-- Verify the user was created
SELECT id, email, created_at FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
