-- Facebook group directory.
-- Shared across all users — populated by admin scrape runs.
-- Matches the FBGroup interface in lib/extract-groups.ts.

CREATE TABLE public.fb_groups (
  id                    TEXT        PRIMARY KEY,  -- extracted group ID from URL
  name                  TEXT        NOT NULL,
  url                   TEXT        NOT NULL,
  snippet               TEXT        NOT NULL DEFAULT '',
  members               INTEGER     NOT NULL DEFAULT 0,
  privacy               TEXT,
  location              TEXT,
  weekly_post_frequency INTEGER     NOT NULL DEFAULT 0,
  has_questions         BOOLEAN,
  intent                TEXT        NOT NULL CHECK (intent IN ('contractor', 'homeowner')),
  trades                TEXT[]      NOT NULL DEFAULT '{}',
  locations             TEXT[]      NOT NULL DEFAULT '{}',
  last_enriched_at      TIMESTAMPTZ,
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX fb_groups_intent_idx   ON public.fb_groups (intent);
CREATE INDEX fb_groups_trades_idx   ON public.fb_groups USING gin (trades);
CREATE INDEX fb_groups_locations_idx ON public.fb_groups USING gin (locations);

CREATE TRIGGER fb_groups_updated_at
  BEFORE UPDATE ON public.fb_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: readable by all authenticated users; writes go through service-role API routes.
ALTER TABLE public.fb_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fb_groups: select authenticated"
  ON public.fb_groups FOR SELECT
  TO authenticated
  USING (true);
