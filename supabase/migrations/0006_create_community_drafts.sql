-- AI-generated post drafts for a user-community pair.
-- One row per (user, community). Generating new posts overwrites the existing row.
-- Matches GeneratedDrafts in lib/community-status.ts.

CREATE TABLE public.community_drafts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id TEXT        NOT NULL,
  introduction TEXT        NOT NULL DEFAULT '',
  value        TEXT        NOT NULL DEFAULT '',
  engagement   TEXT        NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, community_id)
);

CREATE INDEX community_drafts_user_id_idx ON public.community_drafts (user_id);

CREATE TRIGGER community_drafts_updated_at
  BEFORE UPDATE ON public.community_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.community_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_drafts: select own"
  ON public.community_drafts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "community_drafts: insert own"
  ON public.community_drafts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_drafts: update own"
  ON public.community_drafts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "community_drafts: delete own"
  ON public.community_drafts FOR DELETE
  USING (auth.uid() = user_id);
