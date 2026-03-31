import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IntegrationKey {
  id: string;
  service: string;
  key_name: string;
  key_value: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useIntegrationKeys() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['integration-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_keys')
        .select('*')
        .eq('is_active', true)
        .order('service');

      if (error) throw error;
      return data as IntegrationKey[];
    },
  });

  const upsertKey = useMutation({
    mutationFn: async ({
      service,
      key_name,
      key_value,
      description,
    }: {
      service: string;
      key_name: string;
      key_value: string;
      description?: string;
    }) => {
      const { data, error } = await supabase
        .from('integration_keys')
        .upsert(
          { service, key_name, key_value, description, is_active: true },
          { onConflict: 'service,key_name' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-keys'] });
      toast.success('Chave salva com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar chave: ${error.message}`);
    },
  });

  const deleteKey = useMutation({
    mutationFn: async ({ service, key_name }: { service: string; key_name: string }) => {
      const { error } = await supabase
        .from('integration_keys')
        .delete()
        .eq('service', service)
        .eq('key_name', key_name);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integration-keys'] });
      toast.success('Chave removida');
    },
    onError: (error) => {
      toast.error(`Erro ao remover chave: ${error.message}`);
    },
  });

  const getKeyValue = (service: string, key_name: string): string | undefined => {
    return query.data?.find((k) => k.service === service && k.key_name === key_name)?.key_value;
  };

  return {
    keys: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upsertKey,
    deleteKey,
    getKeyValue,
  };
}
