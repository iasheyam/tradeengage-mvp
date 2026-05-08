-- MVP: inspiration_posts and scrape_runs need to be readable/writable
-- by the unauthenticated browser client (no auth session in MVP mode).
ALTER TABLE public.inspiration_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_runs       DISABLE ROW LEVEL SECURITY;
