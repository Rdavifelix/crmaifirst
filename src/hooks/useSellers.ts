import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Seller {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  whatsapp_status?: 'disconnected' | 'connecting' | 'connected' | 'banned';
  whatsapp_phone?: string | null;
  leads_count?: number;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'seller' | 'marketing';
  created_at: string;
}

export function useSellers() {
  return useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      // Get profiles with seller role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'seller');

      if (rolesError) throw rolesError;

      if (!roles || roles.length === 0) {
        return [];
      }

      const userIds = roles.map(r => r.user_id);

      // Get profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get WhatsApp instances
      const profileIds = profiles?.map(p => p.id) || [];
      const { data: instances } = await supabase
        .from('whatsapp_instances')
        .select('owner_id, status, phone_number')
        .in('owner_id', profileIds);

      // Get leads count per seller
      const { data: leadsData } = await supabase
        .from('leads')
        .select('assigned_to')
        .in('assigned_to', userIds);

      const leadsCounts = leadsData?.reduce((acc, lead) => {
        if (lead.assigned_to) {
          acc[lead.assigned_to] = (acc[lead.assigned_to] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Merge data
      return profiles?.map(profile => ({
        ...profile,
        whatsapp_status: instances?.find(i => i.owner_id === profile.id)?.status || 'disconnected',
        whatsapp_phone: instances?.find(i => i.owner_id === profile.id)?.phone_number,
        leads_count: leadsCounts[profile.user_id] || 0,
      })) as Seller[];
    },
  });
}

export function useUserRoles(userId?: string) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId!);

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });
}

export function useCurrentUserRoles() {
  return useQuery({
    queryKey: ['current-user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as UserRole[];
    },
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'seller' | 'marketing' }) => {
      const { data, error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'seller' | 'marketing' }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
    },
  });
}
