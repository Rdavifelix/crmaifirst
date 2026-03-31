-- Create company_settings table for general business settings
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  company_name text,
  company_logo_url text,
  company_phone text,
  company_email text,
  company_address text,
  company_nif text,
  timezone text DEFAULT 'Europe/Lisbon',
  language text DEFAULT 'pt',
  theme text DEFAULT 'system',
  notifications_email boolean DEFAULT true,
  notifications_sound boolean DEFAULT true,
  notifications_new_lead boolean DEFAULT true,
  notifications_new_message boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own company settings"
  ON public.company_settings FOR SELECT
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own company settings"
  ON public.company_settings FOR INSERT
  WITH CHECK (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own company settings"
  ON public.company_settings FOR UPDATE
  USING (owner_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
