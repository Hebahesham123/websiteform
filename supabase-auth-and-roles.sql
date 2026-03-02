-- Run this in Supabase SQL Editor to enable admin and call center roles.
-- Before this: In Supabase Dashboard -> Authentication -> Providers, enable Email.
-- Create your first user: Authentication -> Users -> Add user (email + password).
-- After running this script, make that user admin:
--   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';

-- 1. Create profiles table (one row per dashboard user)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'call_center' CHECK (role IN ('admin', 'call_center')),
  created_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Users can insert their own profile on first login (so they get a row with default role)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 5. Only admins can update any profile (e.g. change roles)
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- 6. Optional: trigger to create profile when a new user signs up (if using Supabase Auth signup)
-- First enable the trigger function:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (new.id, new.email, 'call_center')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (requires superuser or use Supabase Dashboard -> Database -> Webhooks)
-- If you use Supabase Auth UI or signUp(), add this trigger in SQL Editor (may need to run as postgres):
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Make a user admin (run after first signup; replace with the user's email)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@example.com';

-- 8. Allow authenticated users with a profile to read sample_inquiries (dashboard)
-- If you already have "Allow public read", drop it and use this instead for security:
DROP POLICY IF EXISTS "Allow public read for dashboard" ON sample_inquiries;
DROP POLICY IF EXISTS "Dashboard users can read sample_inquiries" ON sample_inquiries;
CREATE POLICY "Dashboard users can read sample_inquiries"
  ON sample_inquiries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
  );

-- 9. Allow dashboard users (admin or call_center) to update sample_inquiries (status, comment)
DROP POLICY IF EXISTS "Allow anonymous update for dashboard" ON sample_inquiries;
DROP POLICY IF EXISTS "Dashboard users can update sample_inquiries" ON sample_inquiries;
CREATE POLICY "Dashboard users can update sample_inquiries"
  ON sample_inquiries FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid())
  );
