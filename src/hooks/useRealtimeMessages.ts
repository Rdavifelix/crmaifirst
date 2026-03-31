import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1aYGprbmxubnBybm5sam5sbG5wcHBycG5ub3BwcG5sbGpub3BwbnBwcm5ubG5ucHBwbnBub3BwcG5ub3BwbW5ubXBwb25sbW1wcHFvbGxucHFycG9sbHBycm5tbG9xcm9vcHBxcXBvcHFycXJycnJxcXFxcHBxcXJycXFxcHBwcHFxcXFycnFxcHBwcHFxcXJycXFxcHBwcXFxcXJycXFwcHBxcXFycnJxcXFwcHFxcXJycnFxcXBwcHFxcnJycXFxcHBxcXFycnJycXFxcHBxcXJycnJxcXFwcHFxcXJycnJxcXFwcHFxcXJycnJxcXFxcHFxcXJycnJxcXFwcXFxcnJycXFxcHBxcXJycnJxcXFwcXFycnJycXFxcHFxcXJycnJxcXFwcXJycnJycXFxcHFxcXJycnJxcXFwcXFycnJycXFxcHFxcXJycnJxcXFwcXJycnJycXFxcHFxcXJycnJxcXFwcXJycnJycXFxcHFxcXJycnJxcXFwcXJycnJycXFxcHFxcXJycnJxcXFwcXJycnJycXFwcXFycnJxcXFxcHFxcXJycnJxcXFwcXJycnJxcXFwcXFycnJxcXFxcHFxcXJycnJxcXFwcXJycnJxcXFwcXFycnJxcXFxcHFxcXJycnJxcXFwcXJycnJxcXFwcXFxcnJxcXFxcHFxcXJycXFxcXBxcXFycnFxcXFwcXFycnJxcXFxcHFxcXJycXFxcXBxcXJycnFxcXFwcXFycnJxcXFxcHFxcXFxcXFxcXBxcXFxcXFxcXFxcHFxcXFxcXFxcXFwcXFxcXFxcXFxcXFxcXBxcXFxcXFxcXFwcHFxcXFxcXFxcHBwcXFxcXFxcXBwcHBxcXFxcXFwcHBwcHFxcXFxcHBwcHBwcXFxcXBwcHBwcHBxcXFwcHBwcHBwcHFxcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwb3BwcHBwcHBwb29vcHBwcHBvb29vcHBwb29vb29vcG9vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vbm9vb29vb29ubm5vb29vb25ubm5vb29vbm5ubm5vb29ubm5ubm5vb25ubm5ubm5vbm5ubm5ubm5ubm5ubm5ubm5ubG5ubm5ubm5ubGxsbm5ubm5sbGxsbG5ubm5sbGxsbGxubm5sbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxra2xsbGxsbGtra2tsbGxsa2tra2tra2xsa2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2tra2pra2tra2tra2pqampra2tra2pqampqamtra2pqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqaZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmZmQ==';

let notificationAudio: HTMLAudioElement | null = null;

function playNotificationSound() {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio(NOTIFICATION_SOUND_URL);
      notificationAudio.volume = 0.5;
    }
    notificationAudio.currentTime = 0;
    notificationAudio.play().catch(() => {
      // Ignore autoplay restrictions
    });
  } catch {
    // Ignore audio errors
  }
}

interface UseRealtimeMessagesOptions {
  leadId?: string;
  onNewMessage?: (message: any) => void;
  showNotifications?: boolean;
}

export function useRealtimeMessages({
  leadId,
  onNewMessage,
  showNotifications = true,
}: UseRealtimeMessagesOptions = {}) {
  const queryClient = useQueryClient();
  const currentLeadIdRef = useRef(leadId);

  // Keep ref updated
  useEffect(() => {
    currentLeadIdRef.current = leadId;
  }, [leadId]);

  const handleNewMessage = useCallback(
    (payload: any) => {
      const newMessage = payload.new;

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['lead-messages'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });

      // Only show notification for incoming messages (from leads)
      if (newMessage.sender_type === 'lead' && showNotifications) {
        // Play sound
        playNotificationSound();

        // Show toast notification
        toast.info('Nova mensagem recebida!', {
          description: newMessage.message?.substring(0, 50) + (newMessage.message?.length > 50 ? '...' : ''),
          duration: 5000,
        });

        // Browser notification (if permitted)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Nova mensagem WhatsApp', {
            body: newMessage.message?.substring(0, 100),
            icon: '/favicon.ico',
            tag: 'whatsapp-message',
          });
        }
      }

      // Callback for custom handling
      onNewMessage?.(newMessage);
    },
    [queryClient, showNotifications, onNewMessage]
  );

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Subscribe to realtime changes on lead_messages
    const channel = supabase
      .channel('lead_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_messages',
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lead_messages',
        },
        () => {
          // Just invalidate to refresh status updates
          queryClient.invalidateQueries({ queryKey: ['lead-messages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleNewMessage, queryClient]);

  return null;
}

export function useRealtimeLeadMessages(leadId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`lead_messages_${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_messages',
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lead-messages', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);
}
