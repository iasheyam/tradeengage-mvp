-- MVP: remove auth enforcement so the showcase works without a login screen.
-- Drops FK constraints to auth.users and disables RLS on all user-specific tables.
-- A single hardcoded demo user is seeded into user_profiles.

ALTER TABLE public.user_profiles         DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE public.community_memberships DROP CONSTRAINT IF EXISTS community_memberships_user_id_fkey;
ALTER TABLE public.community_drafts      DROP CONSTRAINT IF EXISTS community_drafts_user_id_fkey;
ALTER TABLE public.post_history          DROP CONSTRAINT IF EXISTS post_history_user_id_fkey;

ALTER TABLE public.user_profiles         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_drafts      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_history          DISABLE ROW LEVEL SECURITY;

-- Seed the hardcoded MVP user.
INSERT INTO public.user_profiles (id, trade, location)
VALUES ('00000000-0000-0000-0000-000000000001', 'HVAC', 'Atlanta, GA')
ON CONFLICT (id) DO NOTHING;
