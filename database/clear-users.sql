-- Clear all user accounts from Supabase database
-- WARNING: This will permanently delete all registered users

-- Delete all users from the users table
delete from public.users;

-- Reset the auto-increment ID sequence (optional)
-- This will start counting from 1 again for new users
alter sequence public.users_id_seq restart with 1;

-- Verify deletion (should return 0)
select count(*) as remaining_users from public.users;
