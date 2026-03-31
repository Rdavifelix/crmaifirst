-- =============================================
-- SISTEMA CRM COM TRACKING UTM PARA WHATSAPP
-- =============================================

-- 1. Tabela de Perfis de Usuários (atendentes/vendedores)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'attendant' CHECK (role IN ('admin', 'manager', 'attendant')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Tabela de Canais de Tráfego (flexível para adicionar novos)
CREATE TABLE public.traffic_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- social, ads, organic, referral, other
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de Links UTM
CREATE TABLE public.utm_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.traffic_channels(id) ON DELETE SET NULL,
  utm_source TEXT NOT NULL,
  utm_medium TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_term TEXT,
  utm_content TEXT,
  whatsapp_number TEXT NOT NULL,
  whatsapp_message TEXT,
  short_code TEXT UNIQUE,
  full_url TEXT NOT NULL,
  clicks_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de Leads
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  utm_link_id UUID REFERENCES public.utm_links(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'first_contact', 'negotiating', 'proposal_sent', 'follow_up', 'won', 'lost')),
  post_sale_status TEXT CHECK (post_sale_status IN ('awaiting_onboarding', 'in_onboarding', 'onboarding_complete', 'follow_up_30', 'active_client')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_value DECIMAL(10,2),
  loss_reason TEXT,
  notes TEXT,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de Mensagens do Lead (simulação WhatsApp)
CREATE TABLE public.lead_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('lead', 'attendant')),
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabela de Histórico de Status
CREATE TABLE public.lead_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de Etapas de Pós-Venda
CREATE TABLE public.post_sale_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('awaiting_onboarding', 'in_onboarding', 'onboarding_complete', 'follow_up_30', 'active_client')),
  responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- 8. Tabela de Cliques nos Links (tracking)
CREATE TABLE public.link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  utm_link_id UUID NOT NULL REFERENCES public.utm_links(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INSERIR CANAIS DE TRÁFEGO PADRÃO
-- =============================================
INSERT INTO public.traffic_channels (name, category, icon) VALUES
  -- Redes Sociais
  ('Instagram', 'social', 'instagram'),
  ('Instagram Reels', 'social', 'instagram'),
  ('Instagram Stories', 'social', 'instagram'),
  ('Instagram Feed', 'social', 'instagram'),
  ('YouTube', 'social', 'youtube'),
  ('YouTube Shorts', 'social', 'youtube'),
  ('TikTok', 'social', 'video'),
  ('Facebook', 'social', 'facebook'),
  ('LinkedIn', 'social', 'linkedin'),
  ('Twitter/X', 'social', 'twitter'),
  -- Ads
  ('Google Ads', 'ads', 'search'),
  ('Meta Ads', 'ads', 'target'),
  ('TikTok Ads', 'ads', 'video'),
  ('LinkedIn Ads', 'ads', 'linkedin'),
  -- Orgânico
  ('Google Orgânico', 'organic', 'search'),
  ('Blog', 'organic', 'file-text'),
  ('Podcast', 'organic', 'mic'),
  -- Referral
  ('Indicação', 'referral', 'users'),
  ('Parceiro', 'referral', 'handshake'),
  -- Outros
  ('WhatsApp', 'other', 'message-circle'),
  ('Email', 'other', 'mail'),
  ('Evento', 'other', 'calendar'),
  ('Outro', 'other', 'link');

-- =============================================
-- HABILITAR RLS
-- =============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.utm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_sale_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Profiles: usuários podem ver todos os perfis, mas só editar o próprio
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Traffic Channels: todos autenticados podem ver, admins podem editar
CREATE POLICY "Traffic channels are viewable by authenticated users" 
ON public.traffic_channels FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Traffic channels can be created by authenticated users" 
ON public.traffic_channels FOR INSERT 
TO authenticated
WITH CHECK (true);

-- UTM Links: usuários autenticados podem ver e criar
CREATE POLICY "UTM links are viewable by authenticated users" 
ON public.utm_links FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "UTM links can be created by authenticated users" 
ON public.utm_links FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "UTM links can be updated by authenticated users" 
ON public.utm_links FOR UPDATE 
TO authenticated
USING (true);

-- Leads: todos autenticados podem gerenciar
CREATE POLICY "Leads are viewable by authenticated users" 
ON public.leads FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Leads can be created by authenticated users" 
ON public.leads FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Leads can be updated by authenticated users" 
ON public.leads FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Leads can be deleted by authenticated users" 
ON public.leads FOR DELETE 
TO authenticated
USING (true);

-- Lead Messages: todos autenticados podem gerenciar
CREATE POLICY "Lead messages are viewable by authenticated users" 
ON public.lead_messages FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Lead messages can be created by authenticated users" 
ON public.lead_messages FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Lead messages can be updated by authenticated users" 
ON public.lead_messages FOR UPDATE 
TO authenticated
USING (true);

-- Lead Status History: todos autenticados podem ver e criar
CREATE POLICY "Status history is viewable by authenticated users" 
ON public.lead_status_history FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Status history can be created by authenticated users" 
ON public.lead_status_history FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Post Sale Stages: todos autenticados podem gerenciar
CREATE POLICY "Post sale stages are viewable by authenticated users" 
ON public.post_sale_stages FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Post sale stages can be created by authenticated users" 
ON public.post_sale_stages FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Post sale stages can be updated by authenticated users" 
ON public.post_sale_stages FOR UPDATE 
TO authenticated
USING (true);

-- Link Clicks: público pode inserir (para tracking), autenticados podem ver
CREATE POLICY "Link clicks can be inserted by anyone" 
ON public.link_clicks FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Link clicks are viewable by authenticated users" 
ON public.link_clicks FOR SELECT 
TO authenticated
USING (true);

-- =============================================
-- TRIGGERS E FUNÇÕES
-- =============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil no signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Função para incrementar contador de cliques
CREATE OR REPLACE FUNCTION public.increment_link_clicks()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.utm_links 
  SET clicks_count = clicks_count + 1 
  WHERE id = NEW.utm_link_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para incrementar cliques
CREATE TRIGGER on_link_click
AFTER INSERT ON public.link_clicks
FOR EACH ROW
EXECUTE FUNCTION public.increment_link_clicks();

-- Função para registrar mudança de status
CREATE OR REPLACE FUNCTION public.log_lead_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.lead_status_history (lead_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para log de status
CREATE TRIGGER on_lead_status_change
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_lead_status_change();

-- Habilitar realtime para leads e mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;