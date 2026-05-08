-- In-progress Apify actor runs for scraping FB groups and subreddits.
-- Merges the two localStorage keys: fb_group_runs and reddit_runs.
-- The app polls these rows until status transitions to succeeded or failed,
-- then deletes the row (same as clearRunForGroup / clearRunForSubreddit).

CREATE TABLE public.scrape_runs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id TEXT        NOT NULL,
  platform     TEXT        NOT NULL CHECK (platform IN ('facebook', 'reddit')),
  run_id       TEXT        NOT NULL,
  dataset_id   TEXT,
  status       TEXT        NOT NULL DEFAULT 'running'
                           CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,

  UNIQUE (community_id, run_id)
);

CREATE INDEX scrape_runs_community_idx ON public.scrape_runs (community_id);
CREATE INDEX scrape_runs_status_idx    ON public.scrape_runs (status) WHERE status = 'running';

-- Written and read exclusively by server-side API routes (service-role key).
-- No user-facing RLS needed.
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;
