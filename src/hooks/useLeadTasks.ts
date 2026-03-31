import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeadTask {
  id: string;
  lead_id: string;
  profile_id: string;
  assigned_to: string | null;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  meet_link: string | null;
  meeting_id: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLeadTasks(leadId: string) {
  return useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as LeadTask[];
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: {
      lead_id: string;
      profile_id: string;
      assigned_to?: string;
      type: string;
      title: string;
      description?: string;
      priority?: string;
      meet_link?: string;
      scheduled_at?: string;
      duration_minutes?: number;
    }) => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data as LeadTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', data.lead_id] });
    },
  });
}

export function useUpdateLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LeadTask> & { id: string }) => {
      const { data, error } = await supabase
        .from('lead_tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as LeadTask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', data.lead_id] });
    },
  });
}

export function useDeleteLeadTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, leadId }: { id: string; leadId: string }) => {
      const { error } = await supabase
        .from('lead_tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
    },
  });
}
