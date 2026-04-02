-- Migration: Create normalized tables for Google Sheets data
-- These tables mirror the 4 tabs from the master spreadsheet,
-- enabling future migration away from Google Sheets.

-- ============================================
-- Tabela: sheets_leads (aba LEADS - 39 colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sheets_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identidade / contato
  origem text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  faturamento text NOT NULL DEFAULT '',
  profissao text NOT NULL DEFAULT '',
  mql text NOT NULL DEFAULT '',
  socio text NOT NULL DEFAULT '',
  lead_scoring text NOT NULL DEFAULT '',
  -- Datas
  data_cadastro date,
  data_contato date,
  data_agendamento date,
  data_call date,
  hora_call text NOT NULL DEFAULT '',
  -- Pipeline de vendas
  sdr text NOT NULL DEFAULT '',
  status_call text NOT NULL DEFAULT '',
  status_venda text NOT NULL DEFAULT '',
  motivo_noshow text NOT NULL DEFAULT '',
  cash_collected numeric(12,2) NOT NULL DEFAULT 0,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  closer text NOT NULL DEFAULT '',
  produto_vendido text NOT NULL DEFAULT '',
  valor_oportunidade numeric(12,2) NOT NULL DEFAULT 0,
  data_conclusao date,
  razao_perda text NOT NULL DEFAULT '',
  link_reuniao text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  -- 2a call
  data_2call date,
  hora_2call text NOT NULL DEFAULT '',
  status_call_2 text NOT NULL DEFAULT '',
  status_venda_2 text NOT NULL DEFAULT '',
  motivo_noshow_2 text NOT NULL DEFAULT '',
  cash_collected_2 numeric(12,2) NOT NULL DEFAULT 0,
  valor_total_2 numeric(12,2) NOT NULL DEFAULT 0,
  -- Atribuicao de anuncios
  ad_name_email text NOT NULL DEFAULT '',
  ad_name_telefone text NOT NULL DEFAULT '',
  -- Hash para deduplicacao (gerado automaticamente)
  row_hash text GENERATED ALWAYS AS (
    md5(
      coalesce(email, '') || '|' ||
      coalesce(telefone, '') || '|' ||
      coalesce(data_cadastro::text, '') || '|' ||
      coalesce(closer, '') || '|' ||
      coalesce(data_call::text, '')
    )
  ) STORED,
  -- Metadata
  imported_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sheets_leads_row_hash_idx
  ON public.sheets_leads (row_hash);

CREATE INDEX IF NOT EXISTS sheets_leads_data_call_idx ON public.sheets_leads (data_call);
CREATE INDEX IF NOT EXISTS sheets_leads_data_cadastro_idx ON public.sheets_leads (data_cadastro);
CREATE INDEX IF NOT EXISTS sheets_leads_data_agendamento_idx ON public.sheets_leads (data_agendamento);
CREATE INDEX IF NOT EXISTS sheets_leads_data_conclusao_idx ON public.sheets_leads (data_conclusao);
CREATE INDEX IF NOT EXISTS sheets_leads_closer_idx ON public.sheets_leads (closer);
CREATE INDEX IF NOT EXISTS sheets_leads_sdr_idx ON public.sheets_leads (sdr);
CREATE INDEX IF NOT EXISTS sheets_leads_status_venda_idx ON public.sheets_leads (status_venda);

ALTER TABLE public.sheets_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.sheets_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.sheets_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER sheets_leads_updated_at
  BEFORE UPDATE ON public.sheets_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Tabela: sheets_meta_ads (aba META Adveronix - 12 colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sheets_meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date,
  campaign_name text NOT NULL DEFAULT '',
  campaign_id text NOT NULL DEFAULT '',
  ad_set_name text NOT NULL DEFAULT '',
  ad_name text NOT NULL DEFAULT '',
  ad_id text NOT NULL DEFAULT '',
  amount_spent numeric(12,2) NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  three_sec_views integer NOT NULL DEFAULT 0,
  video_watches_75 integer NOT NULL DEFAULT 0,
  link_clicks integer NOT NULL DEFAULT 0,
  landing_page_views integer NOT NULL DEFAULT 0,
  -- Hash para deduplicacao
  row_hash text GENERATED ALWAYS AS (
    md5(
      coalesce(day::text, '') || '|' ||
      coalesce(ad_id, '') || '|' ||
      coalesce(campaign_id, '') || '|' ||
      coalesce(ad_name, '')
    )
  ) STORED,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sheets_meta_ads_row_hash_idx
  ON public.sheets_meta_ads (row_hash);

CREATE INDEX IF NOT EXISTS sheets_meta_ads_day_idx ON public.sheets_meta_ads (day);
CREATE INDEX IF NOT EXISTS sheets_meta_ads_campaign_name_idx ON public.sheets_meta_ads (campaign_name);

ALTER TABLE public.sheets_meta_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.sheets_meta_ads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.sheets_meta_ads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Tabela: sheets_ghl_base (aba BASE GHL - 20 colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sheets_ghl_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL DEFAULT '',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  created date,
  last_activity date,
  tags text NOT NULL DEFAULT '',
  utm_placement text NOT NULL DEFAULT '',
  utm_target text NOT NULL DEFAULT '',
  utm_term text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_content text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  faixa_faturamento text NOT NULL DEFAULT '',
  area_atuacao text NOT NULL DEFAULT '',
  faixa_faturamento_mensal text NOT NULL DEFAULT '',
  ad_name text NOT NULL DEFAULT '',
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sheets_ghl_base_contact_id_idx
  ON public.sheets_ghl_base (contact_id) WHERE contact_id != '';

CREATE INDEX IF NOT EXISTS sheets_ghl_base_created_idx ON public.sheets_ghl_base (created);
CREATE INDEX IF NOT EXISTS sheets_ghl_base_utm_campaign_idx ON public.sheets_ghl_base (utm_campaign);

ALTER TABLE public.sheets_ghl_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.sheets_ghl_base
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.sheets_ghl_base
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- Tabela: sheets_ghl_leads (aba GHL LEADS - 18 colunas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sheets_ghl_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id text NOT NULL DEFAULT '',
  nome text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  telefone text NOT NULL DEFAULT '',
  data_criacao date,
  tags text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  faturamento text NOT NULL DEFAULT '',
  profissao text NOT NULL DEFAULT '',
  campaign_first text NOT NULL DEFAULT '',
  ad_name_first text NOT NULL DEFAULT '',
  utm_source text NOT NULL DEFAULT '',
  session_source text NOT NULL DEFAULT '',
  campaign_latest text NOT NULL DEFAULT '',
  ad_name_latest text NOT NULL DEFAULT '',
  funil text NOT NULL DEFAULT '',
  socio text NOT NULL DEFAULT '',
  webinar_tag text NOT NULL DEFAULT '',
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sheets_ghl_leads_contact_id_idx
  ON public.sheets_ghl_leads (contact_id) WHERE contact_id != '';

CREATE INDEX IF NOT EXISTS sheets_ghl_leads_data_criacao_idx ON public.sheets_ghl_leads (data_criacao);
CREATE INDEX IF NOT EXISTS sheets_ghl_leads_funil_idx ON public.sheets_ghl_leads (funil);

ALTER TABLE public.sheets_ghl_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.sheets_ghl_leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.sheets_ghl_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
