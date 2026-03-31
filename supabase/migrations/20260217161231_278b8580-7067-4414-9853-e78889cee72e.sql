-- Add Sales Score and BANT qualification fields to leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sales_score integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bant_budget text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS bant_authority text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS bant_need text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS bant_timeline text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS score_calculated_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.sales_score IS 'Score de vendas de 0 a 100';
COMMENT ON COLUMN public.leads.bant_budget IS 'Qualificação BANT - Budget: confirmed, negative, unknown';
COMMENT ON COLUMN public.leads.bant_authority IS 'Qualificação BANT - Authority: confirmed, negative, unknown';
COMMENT ON COLUMN public.leads.bant_need IS 'Qualificação BANT - Need: confirmed, negative, unknown';
COMMENT ON COLUMN public.leads.bant_timeline IS 'Qualificação BANT - Timeline: confirmed, negative, unknown';
COMMENT ON COLUMN public.leads.score_calculated_at IS 'Última vez que o score foi calculado';