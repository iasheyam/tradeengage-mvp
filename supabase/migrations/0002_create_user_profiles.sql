-- User profile data extending Supabase auth.users.
-- One row per authenticated user. Created automatically on first sign-up
-- via the handle_new_user trigger.

CREATE TABLE public.user_profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    TEXT,
  last_name     TEXT,
  email         TEXT,
  company_name  TEXT,
  trade         TEXT        NOT NULL DEFAULT '',
  location      TEXT        NOT NULL DEFAULT '',
  bio           TEXT,
  website       TEXT,
  phone         TEXT,
  referral_link TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: each user can only read and write their own profile.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles: select own"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "user_profiles: insert own"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "user_profiles: update own"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
