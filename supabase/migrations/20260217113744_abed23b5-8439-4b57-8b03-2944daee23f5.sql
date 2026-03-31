
-- Add welcome message settings to whatsapp_instances
ALTER TABLE public.whatsapp_instances
ADD COLUMN auto_welcome_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN welcome_message text DEFAULT 'Olá! 👋 Obrigado por entrar em contacto. Em breve um dos nossos consultores irá atendê-lo.';
