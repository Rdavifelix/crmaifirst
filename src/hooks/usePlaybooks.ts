import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for playbook structure (simplified — no keywords, LLM handles detection)
export interface ChecklistItem {
  label: string;
}

export interface PlaybookPhase {
  name: string;
  description?: string;
  checklist: ChecklistItem[];
  forbidden_topics: string[]; // plain descriptions, no keywords
  tips?: string;
}

export interface SalesPlaybook {
  id: string;
  name: string;
  description: string | null;
  context: string | null;
  phases: PlaybookPhase[];
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export function usePlaybooks() {
  const queryClient = useQueryClient();

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ['sales-playbooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_playbooks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        phases: (p.phases as unknown as PlaybookPhase[]) || [],
      })) as SalesPlaybook[];
    },
  });

  const activePlaybooks = playbooks.filter(p => p.is_active);

  const createPlaybook = useMutation({
    mutationFn: async (playbook: { name: string; description?: string; context?: string; phases: PlaybookPhase[] }) => {
      const { data: profile } = await supabase.from('profiles').select('id').single();
      const { data, error } = await supabase.from('sales_playbooks').insert({
        name: playbook.name,
        description: playbook.description || null,
        context: playbook.context || null,
        phases: playbook.phases as unknown as any,
        created_by: profile?.id || null,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-playbooks'] });
      toast.success('Playbook criado!');
    },
    onError: () => toast.error('Erro ao criar playbook'),
  });

  const updatePlaybook = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesPlaybook> & { id: string }) => {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.context !== undefined) updateData.context = updates.context;
      if (updates.phases !== undefined) updateData.phases = updates.phases as unknown as any;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

      const { error } = await supabase.from('sales_playbooks').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-playbooks'] });
      toast.success('Playbook atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar playbook'),
  });

  return { playbooks, activePlaybooks, isLoading, createPlaybook, updatePlaybook };
}
