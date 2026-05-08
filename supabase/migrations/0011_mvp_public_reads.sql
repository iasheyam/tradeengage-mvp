-- MVP: fb_groups and subreddits are shared/admin-managed tables.
-- Disable RLS so the unauthenticated browser client can read them.
ALTER TABLE public.fb_groups   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subreddits  DISABLE ROW LEVEL SECURITY;
