-- Shared trigger function: automatically updates updated_at on every row change.
-- Applied to every table that has an updated_at column.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
