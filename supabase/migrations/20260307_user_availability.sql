-- User Availability table - stores working hours per day of week per user
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 6=sabado
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, day_of_week)
);

-- RLS
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;

-- Users can view all availability (needed for scheduling)
CREATE POLICY "Anyone authenticated can view availability"
  ON public.user_availability FOR SELECT
  TO authenticated
  USING (true);

-- Users can only manage their own availability
CREATE POLICY "Users can insert own availability"
  ON public.user_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own availability"
  ON public.user_availability FOR UPDATE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own availability"
  ON public.user_availability FOR DELETE
  TO authenticated
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Seed default availability (Mon-Fri 9-18) for existing profiles
INSERT INTO public.user_availability (profile_id, day_of_week, start_time, end_time, is_available)
SELECT p.id, d.day, '09:00'::TIME, '18:00'::TIME,
  CASE WHEN d.day BETWEEN 1 AND 5 THEN true ELSE false END
FROM public.profiles p
CROSS JOIN (SELECT generate_series(0, 6) AS day) d
ON CONFLICT (profile_id, day_of_week) DO NOTHING;

-- Trigger to auto-create availability for new profiles
CREATE OR REPLACE FUNCTION public.create_default_availability()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_availability (profile_id, day_of_week, start_time, end_time, is_available)
  SELECT NEW.id, d.day, '09:00'::TIME, '18:00'::TIME,
    CASE WHEN d.day BETWEEN 1 AND 5 THEN true ELSE false END
  FROM (SELECT generate_series(0, 6) AS day) d
  ON CONFLICT (profile_id, day_of_week) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_availability
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_availability();
