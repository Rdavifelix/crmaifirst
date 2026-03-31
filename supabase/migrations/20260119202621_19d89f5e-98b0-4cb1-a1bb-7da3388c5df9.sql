
-- ============================================
-- FASE 1: ARQUITETURA DE ROLES SEGURA
-- ============================================

-- 1.1 Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'marketing');

-- 1.2 Criar tabela user_roles (separada de profiles para segurança)
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 1.3 Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.4 Criar função SECURITY DEFINER para verificar roles (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- 1.5 Criar função para verificar se é admin ou seller
CREATE OR REPLACE FUNCTION public.is_admin_or_seller(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin', 'seller')
    )
$$;

-- 1.6 RLS para user_roles - apenas admins podem ver/modificar
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 1.7 Migrar roles existentes de profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
    CASE 
        WHEN role = 'admin' THEN 'admin'::app_role
        WHEN role = 'seller' THEN 'seller'::app_role
        WHEN role = 'marketing' THEN 'marketing'::app_role
        ELSE 'seller'::app_role
    END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- FASE 2: INSTÂNCIAS WHATSAPP (UAZAPI)
-- ============================================

-- 2.1 Criar enum para status da instância
CREATE TYPE public.whatsapp_instance_status AS ENUM ('disconnected', 'connecting', 'connected', 'banned');

-- 2.2 Criar tabela whatsapp_instances
CREATE TABLE public.whatsapp_instances (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    instance_id text UNIQUE,
    token text,
    status whatsapp_instance_status NOT NULL DEFAULT 'disconnected',
    phone_number text,
    qr_code_base64 text,
    webhook_secret text,
    last_connected_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2.3 Habilitar RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- 2.4 RLS - vendedores veem apenas sua instância, admins veem todas
CREATE POLICY "Sellers can view their own WhatsApp instance"
ON public.whatsapp_instances
FOR SELECT
TO authenticated
USING (
    owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sellers can insert their own WhatsApp instance"
ON public.whatsapp_instances
FOR INSERT
TO authenticated
WITH CHECK (
    owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Sellers can update their own WhatsApp instance"
ON public.whatsapp_instances
FOR UPDATE
TO authenticated
USING (
    owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only admins can delete WhatsApp instances"
ON public.whatsapp_instances
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2.5 Trigger para updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- FASE 2.5: ATUALIZAR LEAD_MESSAGES PARA WHATSAPP
-- ============================================

ALTER TABLE public.lead_messages 
ADD COLUMN IF NOT EXISTS whatsapp_instance_id uuid REFERENCES public.whatsapp_instances(id),
ADD COLUMN IF NOT EXISTS uazapi_message_id text,
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outgoing' CHECK (direction IN ('incoming', 'outgoing')),
ADD COLUMN IF NOT EXISTS message_status text DEFAULT 'pending' CHECK (message_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS media_type text;

-- ============================================
-- FASE 2.6: RLS GRANULAR PARA LEADS (por assigned_to)
-- ============================================

DROP POLICY IF EXISTS "Leads are viewable by authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Leads can be updated by authenticated users" ON public.leads;
DROP POLICY IF EXISTS "Leads can be deleted by authenticated users" ON public.leads;

CREATE POLICY "Leads are viewable by owner, assigned seller or admin"
ON public.leads
FOR SELECT
TO authenticated
USING (
    assigned_to = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'marketing')
);

CREATE POLICY "Leads can be updated by assigned seller or admin"
ON public.leads
FOR UPDATE
TO authenticated
USING (
    assigned_to = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Leads can be deleted by admin only"
ON public.leads
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Habilitar realtime para whatsapp_instances
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
