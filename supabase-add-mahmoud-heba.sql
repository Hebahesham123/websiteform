-- Grant dashboard access: add users to profiles with role admin or call_center
--
-- 1. Run supabase-auth-and-roles.sql first (creates profiles table and RLS).
-- 2. Create users in Supabase → Authentication → Users if needed.
-- 3. Run the block below for the user who needs access, then refresh the dashboard.

-- Heba (heba1@gmail.com) – call center
INSERT INTO profiles (user_id, email, role)
VALUES ('d8f41cd7-aaca-45d4-9c85-c16749bb80e7', 'heba1@gmail.com', 'call_center')
ON CONFLICT (user_id) DO UPDATE SET role = 'call_center', email = EXCLUDED.email;

-- Mahmoud – admin (replace email with his sign-in email)
-- UPDATE profiles SET role = 'admin' WHERE email = 'mahmoud@example.com';
