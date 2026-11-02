-- Apply before publishing. Public API keys must never read club state or password hashes.
CREATE TABLE IF NOT EXISTS public.app_state_snapshots (
  id varchar(50) PRIMARY KEY,
  state_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 0
);
ALTER TABLE public.app_state_snapshots ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
ALTER TABLE public.app_state_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow snapshot sync" ON public.app_state_snapshots;
REVOKE ALL ON public.app_state_snapshots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.app_state_snapshots TO service_role;
