
-- Tabela: wavoip_devices (token WaVoIP por vendedor)
CREATE TABLE public.wavoip_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  name TEXT DEFAULT 'Dispositivo WaVoIP',
  phone_number TEXT,
  status TEXT DEFAULT 'disconnected',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wavoip_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wavoip devices"
  ON public.wavoip_devices FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own wavoip devices"
  ON public.wavoip_devices FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own wavoip devices"
  ON public.wavoip_devices FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete wavoip devices"
  ON public.wavoip_devices FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_wavoip_devices_updated_at
  BEFORE UPDATE ON public.wavoip_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: call_history
CREATE TABLE public.call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wavoip_device_id UUID REFERENCES public.wavoip_devices(id),
  profile_id UUID REFERENCES public.profiles(id),
  lead_id UUID REFERENCES public.leads(id),
  direction TEXT NOT NULL DEFAULT 'OUTGOING',
  status TEXT NOT NULL DEFAULT 'CALLING',
  peer_phone TEXT NOT NULL,
  peer_name TEXT,
  duration_seconds INTEGER DEFAULT 0,
  transcription TEXT,
  transcriptions JSONB DEFAULT '[]',
  ai_summary TEXT,
  ai_sentiment TEXT,
  ai_key_points JSONB DEFAULT '[]',
  ai_suggested_tasks JSONB DEFAULT '[]',
  ai_processed_at TIMESTAMPTZ,
  ai_processing_error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call history"
  ON public.call_history FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert call history"
  ON public.call_history FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own call history"
  ON public.call_history FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Tabela: sales_playbooks
CREATE TABLE public.sales_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  context TEXT,
  phases JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view playbooks"
  ON public.sales_playbooks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert playbooks"
  ON public.sales_playbooks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update playbooks"
  ON public.sales_playbooks FOR UPDATE
  USING (true);

-- Tabela: coach_sessions
CREATE TABLE public.coach_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID REFERENCES public.sales_playbooks(id),
  lead_id UUID REFERENCES public.leads(id),
  call_id UUID REFERENCES public.call_history(id),
  profile_id UUID REFERENCES public.profiles(id),
  current_phase_index INTEGER DEFAULT 0,
  checklist_state JSONB DEFAULT '{}',
  events JSONB DEFAULT '[]',
  briefing TEXT,
  phases_completed INTEGER DEFAULT 0,
  alerts_triggered INTEGER DEFAULT 0,
  suggestions_shown INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach sessions"
  ON public.coach_sessions FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert coach sessions"
  ON public.coach_sessions FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own coach sessions"
  ON public.coach_sessions FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- RPC: find_lead_by_phone
CREATE OR REPLACE FUNCTION public.find_lead_by_phone(p_phone TEXT)
RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
  v_clean_phone TEXT;
BEGIN
  v_clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');

  SELECT id INTO v_lead_id FROM public.leads
  WHERE regexp_replace(phone, '[^0-9]', '', 'g') = v_clean_phone
  LIMIT 1;

  IF v_lead_id IS NULL AND length(v_clean_phone) > 10 THEN
    SELECT id INTO v_lead_id FROM public.leads
    WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE '%' || right(v_clean_phone, 11)
    LIMIT 1;
  END IF;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
