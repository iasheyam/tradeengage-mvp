-- Subreddit directory.
-- Shared across all users — populated by admin scrape runs.
-- Matches the Subreddit interface in lib/extract-subreddits.ts.

CREATE TABLE public.subreddits (
  name                  TEXT        PRIMARY KEY,  -- subreddit name, e.g. "HomeImprovement"
  title                 TEXT        NOT NULL DEFAULT '',
  description           TEXT        NOT NULL DEFAULT '',
  url                   TEXT        NOT NULL,
  subscribers           INTEGER     NOT NULL DEFAULT 0,
  weekly_post_frequency INTEGER     NOT NULL DEFAULT 0,
  intent                TEXT        NOT NULL CHECK (intent IN ('contractor', 'homeowner')),
  trades                TEXT[]      NOT NULL DEFAULT '{}',
  locations             TEXT[]      NOT NULL DEFAULT '{}',
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX subreddits_intent_idx    ON public.subreddits (intent);
CREATE INDEX subreddits_trades_idx    ON public.subreddits USING gin (trades);
CREATE INDEX subreddits_locations_idx ON public.subreddits USING gin (locations);

CREATE TRIGGER subreddits_updated_at
  BEFORE UPDATE ON public.subreddits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: readable by all authenticated users; writes go through service-role API routes.
ALTER TABLE public.subreddits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subreddits: select authenticated"
  ON public.subreddits FOR SELECT
  TO authenticated
  USING (true);
