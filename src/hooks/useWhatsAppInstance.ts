import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppInstance {
  id: string;
  owner_id: string;
  instance_id: string | null;
  token: string | null;
  status: 'disconnected' | 'connecting' | 'connected' | 'banned';
  phone_number: string | null;
  qr_code_base64: string | null;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QRCodeResponse {
  qrcode?: string;
  connected: boolean;
  status: string;
  phone_number?: string;
}

export function useWhatsAppInstance() {
  return useQuery({
    queryKey: ['whatsapp-instance'],
    queryFn: async () => {
      // First get the current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) return null;

      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('owner_id', profile.id)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppInstance | null;
    },
  });
}

export function useCreateInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-instance-create', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
    },
  });
}

export function useGetQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<QRCodeResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-get-qrcode', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
    },
  });
}

export function useManualConnect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ url, instance_token }: { url: string; instance_token: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-manual-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { url, instance_token },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
    },
  });
}

export function useCheckStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-check-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
    },
  });
}

export interface UazapiRemoteInstance {
  id?: string;
  name?: string;
  status?: string;
  profileName?: string;
  profilePicUrl?: string;
  phone?: string;
  owner?: string;
  createdAt?: string;
  lastDisconnect?: string;
  disconnectionReason?: string;
  _db_linked?: boolean;
  _db_status?: string | null;
  _db_phone?: string | null;
  _db_owner_id?: string | null;
  [key: string]: any;
}

export function useListUazapiInstances() {
  return useMutation({
    mutationFn: async (): Promise<UazapiRemoteInstance[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-list-instances', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { action: 'list' },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data?.instances || [];
    },
  });
}

export function useLinkUazapiInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inst: { instance_id: string; instance_token: string; instance_name?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-list-instances', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: 'link_instance',
          instance_id: inst.instance_id,
          instance_token: inst.instance_token,
          instance_name: inst.instance_name,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
    },
  });
}

export function useSendWhatsAppMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lead_id, 
      message, 
      media_url, 
      media_type 
    }: { 
      lead_id: string; 
      message: string; 
      media_url?: string; 
      media_type?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('uazapi-send-message', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { lead_id, message, media_url, media_type },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lead-messages', variables.lead_id] });
      await queryClient.cancelQueries({ queryKey: ['all-lead-messages-summary'] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['lead-messages', variables.lead_id]);

      // Optimistically update to the new value
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        lead_id: variables.lead_id,
        message: variables.message,
        sender_type: 'attendant',
        direction: 'outgoing',
        message_status: 'pending',
        created_at: new Date().toISOString(),
        media_url: variables.media_url || null,
        media_type: variables.media_type || null,
      };

      queryClient.setQueryData(['lead-messages', variables.lead_id], (old: any[] = []) => [
        ...old,
        optimisticMessage,
      ]);

      // Return a context object with the snapshotted value
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(['lead-messages', variables.lead_id], context.previousMessages);
      }
    },
    onSettled: (_, __, variables) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['lead-messages', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['all-lead-messages-summary'] });
    },
  });
}
