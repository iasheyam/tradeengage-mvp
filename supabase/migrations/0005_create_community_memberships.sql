-- A user's relationship with a community (joined / pending / not_interested).
-- community_id uses the same composite key convention as localStorage:
--   Facebook: "fb-{group_id}"  e.g. "fb-123456789"
--   Reddit:   "reddit-{name}"  e.g. "reddit-HomeImprovement"
-- This avoids the need for a cross-platform communities union table.

CREATE TABLE public.community_memberships (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id TEXT        NOT NULL,
  platform     TEXT        NOT NULL CHECK (platform IN ('facebook', 'reddit')),
  status       TEXT        NOT NULL CHECK (status IN ('joined', 'pending', 'not_interested')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, community_id)
);

CREATE INDEX community_memberships_user_id_idx ON public.community_memberships (user_id);
CREATE INDEX community_memberships_status_idx  ON public.community_memberships (user_id, status);

CREATE TRIGGER community_memberships_updated_at
  BEFORE UPDATE ON public.community_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "community_memberships: select own"
  ON public.community_memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "community_memberships: insert own"
  ON public.community_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "community_memberships: update own"
  ON public.community_memberships FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "community_memberships: delete own"
  ON public.community_memberships FOR DELETE
  USING (auth.uid() = user_id);
