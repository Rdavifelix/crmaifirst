import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Lead {
  id: string;
  utm_link_id: string | null;
  name: string | null;
  phone: string;
  email: string | null;
  avatar_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  status: string;
  post_sale_status: string | null;
  assigned_to: string | null;
  deal_value: number | null;
  loss_reason: string | null;
  notes: string | null;
  entered_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  instagram_username: string | null;
  instagram_data: any | null;
  sales_score: number | null;
  bant_budget: string | null;
  bant_authority: string | null;
  bant_need: string | null;
  bant_timeline: string | null;
  score_calculated_at: string | null;
}

export interface LeadMessage {
  id: string;
  lead_id: string;
  sender_type: 'lead' | 'attendant';
  sender_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LeadStatusHistory {
  id: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface PostSaleStage {
  id: string;
  lead_id: string;
  stage: string;
  started_at: string;
  completed_at: string | null;
  responsible_id: string | null;
  notes: string | null;
}

export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id,
  });
}

export function useLeadMessages(leadId: string) {
  return useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as LeadMessage[];
    },
    enabled: !!leadId,
  });
}

export function useLeadStatusHistory(leadId: string) {
  return useQuery({
    queryKey: ['lead-status-history', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_status_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as LeadStatusHistory[];
    },
    enabled: !!leadId,
  });
}

export function useLeadPostSaleStages(leadId: string) {
  return useQuery({
    queryKey: ['lead-post-sale-stages', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('post_sale_stages')
        .select('*')
        .eq('lead_id', leadId)
        .order('started_at', { ascending: true });
      
      if (error) throw error;
      return data as PostSaleStage[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lead: Omit<Partial<Lead>, 'id' | 'created_at' | 'updated_at'> & { phone: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .insert([lead])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar lead', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: 'Lead atualizado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: Omit<LeadMessage, 'id' | 'created_at' | 'is_read'>) => {
      const { data, error } = await supabase
        .from('lead_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-messages', variables.lead_id] });
    },
  });
}