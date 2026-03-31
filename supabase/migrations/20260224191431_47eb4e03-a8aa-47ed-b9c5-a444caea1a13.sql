
CREATE TABLE public.lead_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'active',
  transcriptions jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_key_points jsonb DEFAULT '[]'::jsonb,
  ai_sentiment text,
  duration_seconds integer DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead meetings"
  ON public.lead_meetings FOR SELECT TO authenticated
  USING (
    (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can insert own lead meetings"
  ON public.lead_meetings FOR INSERT TO authenticated
  WITH CHECK (
    (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can update own lead meetings"
  ON public.lead_meetings FOR UPDATE TO authenticated
  USING (
    (profile_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );
