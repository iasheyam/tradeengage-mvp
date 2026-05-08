-- Posts a user has marked as published or pending approval.
-- One row per (user, community, post_type) — the same upsert semantics as
-- upsertHistoryItem() in lib/community-status.ts.
-- posted_at is set on first insert and never overwritten on updates.

CREATE TABLE public.post_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id TEXT        NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('introduction', 'value', 'engagement')),
  content      TEXT        NOT NULL,
  status       TEXT        NOT NULL CHECK (status IN ('posted', 'pending_approval')),
  posted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- At most one history entry per post type per community per user.
  UNIQUE (user_id, community_id, type)
);

CREATE INDEX post_history_user_id_idx     ON public.post_history (user_id);
CREATE INDEX post_history_community_idx   ON public.post_history (user_id, community_id);
CREATE INDEX post_history_posted_at_idx   ON public.post_history (user_id, posted_at DESC);

CREATE TRIGGER post_history_updated_at
  BEFORE UPDATE ON public.post_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE public.post_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_history: select own"
  ON public.post_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "post_history: insert own"
  ON public.post_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "post_history: update own"
  ON public.post_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "post_history: delete own"
  ON public.post_history FOR DELETE
  USING (auth.uid() = user_id);
