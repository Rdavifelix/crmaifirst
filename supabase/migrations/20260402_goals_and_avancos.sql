-- Migration: Create goals and avancos tables
-- Goals: metas comerciais (receita, vendas, leads, agendamentos)
-- Avancos: pipeline "Na Mesa" para acompanhamento de deals

-- ============================================
-- Tabela: goals
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,                    -- "2026-04"
  member_name text,                        -- NULL = meta global da equipe
  role text,                               -- "closer", "sdr", etc.
  metric text NOT NULL,                    -- "receita", "vendas", "leads", "agendamentos"
  target numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint com COALESCE para tratar NULLs corretamente
CREATE UNIQUE INDEX IF NOT EXISTS goals_period_member_metric_idx
  ON public.goals (period, COALESCE(member_name, ''), metric);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.goals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger para updated_at (cria funcao apenas se nao existir)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- Tabela: avancos
-- ============================================
CREATE TABLE IF NOT EXISTS public.avancos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_nome text,
  lead_empresa text,
  lead_telefone text,
  lead_email text,
  closer_name text,
  sdr_name text,
  lead_scoring integer,
  valor numeric DEFAULT 0,
  data_limite date,
  funil text,
  etapas jsonb DEFAULT '[]',
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.avancos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.avancos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER avancos_updated_at
  BEFORE UPDATE ON public.avancos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
