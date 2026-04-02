-- Fix: row_hash must be a regular column (not GENERATED) so PostgREST can upsert on it.

-- sheets_leads: drop generated column, recreate as regular text
ALTER TABLE public.sheets_leads DROP COLUMN IF EXISTS row_hash;
ALTER TABLE public.sheets_leads ADD COLUMN row_hash text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS sheets_leads_row_hash_idx
  ON public.sheets_leads (row_hash);

-- sheets_meta_ads: drop generated column, recreate as regular text
ALTER TABLE public.sheets_meta_ads DROP COLUMN IF EXISTS row_hash;
ALTER TABLE public.sheets_meta_ads ADD COLUMN row_hash text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS sheets_meta_ads_row_hash_idx
  ON public.sheets_meta_ads (row_hash);
