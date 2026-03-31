import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessages() {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lead_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_type', 'lead')
        .eq('is_read', false);

      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  // Realtime: refresh count on new messages
  useEffect(() => {
    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_messages' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return unreadCount;
}
