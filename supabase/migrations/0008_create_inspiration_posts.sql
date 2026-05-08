-- Real posts scraped from FB groups and subreddits.
-- Used as style examples when generating drafts.
-- Merges the two localStorage keys: fb_group_posts and reddit_posts.
-- community_id follows the same convention as community_memberships:
--   "fb-{group_id}" or "reddit-{name}"

CREATE TABLE public.inspiration_posts (
  id             TEXT        NOT NULL,  -- platform-native post ID
  community_id   TEXT        NOT NULL,
  platform       TEXT        NOT NULL CHECK (platform IN ('facebook', 'reddit')),
  url            TEXT,
  title          TEXT,                  -- Reddit only; NULL for Facebook
  body           TEXT        NOT NULL DEFAULT '',
  posted_at      TIMESTAMPTZ,
  author_name    TEXT        NOT NULL DEFAULT '',
  likes_count    INTEGER     NOT NULL DEFAULT 0,
  comments_count INTEGER     NOT NULL DEFAULT 0,
  fetched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id, community_id)
);

CREATE INDEX inspiration_posts_community_idx ON public.inspiration_posts (community_id);
CREATE INDEX inspiration_posts_fetched_idx   ON public.inspiration_posts (community_id, fetched_at DESC);

-- No RLS — these are shared reference data written by server-side scrape runs.
-- API routes use the service-role key to write; anon/authenticated can read.
ALTER TABLE public.inspiration_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspiration_posts: select authenticated"
  ON public.inspiration_posts FOR SELECT
  TO authenticated
  USING (true);
