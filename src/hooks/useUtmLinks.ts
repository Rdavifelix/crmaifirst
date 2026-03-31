import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface UtmLink {
  id: string;
  created_by: string | null;
  channel_id: string | null;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string | null;
  utm_content: string | null;
  whatsapp_number: string;
  whatsapp_message: string | null;
  short_code: string | null;
  full_url: string;
  clicks_count: number;
  is_active: boolean;
  created_at: string;
}

export interface TrafficChannel {
  id: string;
  name: string;
  category: string;
  icon: string | null;
  is_active: boolean;
  created_at: string;
}

export function useTrafficChannels() {
  return useQuery({
    queryKey: ['traffic-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traffic_channels')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      return data as TrafficChannel[];
    },
  });
}

export function useUtmLinks() {
  return useQuery({
    queryKey: ['utm-links'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('utm_links')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as UtmLink[];
    },
  });
}

export function useCreateUtmLink() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (link: Omit<UtmLink, 'id' | 'created_at' | 'clicks_count' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('utm_links')
        .insert({ ...link, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['utm-links'] });
      toast({ title: 'Link UTM criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar link', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (channel: Omit<TrafficChannel, 'id' | 'created_at' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('traffic_channels')
        .insert(channel)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traffic-channels'] });
      toast({ title: 'Canal criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar canal', description: error.message, variant: 'destructive' });
    },
  });
}

// Função para gerar link do WhatsApp com UTM
export function generateWhatsAppLink(
  whatsappNumber: string,
  message: string,
  utmParams: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term?: string;
    utm_content?: string;
  }
) {
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const encodedMessage = encodeURIComponent(message);
  
  // Construir URL base do WhatsApp
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  
  // Construir parâmetros UTM (sem encode extra, já que vão direto na URL)
  const utmParts = Object.entries(utmParams)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`);
  
  // A URL de tracking terá os UTMs e o redirect para o WhatsApp
  // O redirect precisa de apenas UM encodeURIComponent
  const trackingUrl = `${window.location.origin}/track?${utmParts.join('&')}&redirect=${encodeURIComponent(whatsappUrl)}`;
  
  return {
    whatsappUrl,
    trackingUrl,
    utmString: utmParts.join('&'),
  };
}