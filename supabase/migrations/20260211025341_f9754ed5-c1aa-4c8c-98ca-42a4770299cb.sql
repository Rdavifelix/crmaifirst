
-- =============================================
-- Fase 1: Tabelas candidates e interview_sessions
-- =============================================

-- Tabela de candidatos
CREATE TABLE public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  signature_analysis JSONB,
  signature_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'registered',
  interview_score NUMERIC,
  interview_analysis JSONB,
  meet_link TEXT,
  meet_event_id TEXT,
  created_by UUID REFERENCES public.profiles(id),
  token TEXT UNIQUE NOT NULL,
  notes TEXT,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de sessões de entrevista
CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active',
  transcriptions JSONB DEFAULT '[]'::jsonb,
  ai_analysis JSONB,
  ai_score NUMERIC,
  ai_sentiment TEXT,
  duration_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS: candidates
-- =============================================

-- Anon pode INSERT (formulário público)
CREATE POLICY "Anyone can insert candidates via public form"
ON public.candidates FOR INSERT
WITH CHECK (true);

-- Autenticados com role admin/seller podem SELECT
CREATE POLICY "Admins and sellers can view candidates"
ON public.candidates FOR SELECT
USING (public.is_admin_or_seller(auth.uid()));

-- Autenticados com role admin/seller podem UPDATE
CREATE POLICY "Admins and sellers can update candidates"
ON public.candidates FOR UPDATE
USING (public.is_admin_or_seller(auth.uid()));

-- Admins podem DELETE
CREATE POLICY "Admins can delete candidates"
ON public.candidates FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- RLS: interview_sessions
-- =============================================

CREATE POLICY "Admins and sellers can view interview sessions"
ON public.interview_sessions FOR SELECT
USING (public.is_admin_or_seller(auth.uid()));

CREATE POLICY "Admins and sellers can insert interview sessions"
ON public.interview_sessions FOR INSERT
WITH CHECK (public.is_admin_or_seller(auth.uid()));

CREATE POLICY "Admins and sellers can update interview sessions"
ON public.interview_sessions FOR UPDATE
USING (public.is_admin_or_seller(auth.uid()));

-- =============================================
-- Triggers para updated_at
-- =============================================

CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Storage bucket para fotos dos candidatos
-- =============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('candidate-photos', 'candidate-photos', true);

-- Qualquer um pode fazer upload (formulário público)
CREATE POLICY "Anyone can upload candidate photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'candidate-photos');

-- Qualquer um pode ver (fotos públicas)
CREATE POLICY "Anyone can view candidate photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'candidate-photos');

-- Admins podem deletar
CREATE POLICY "Admins can delete candidate photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'candidate-photos' AND public.has_role(auth.uid(), 'admin'));
