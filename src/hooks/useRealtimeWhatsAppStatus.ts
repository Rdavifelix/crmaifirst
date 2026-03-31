import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Som de alerta urgente (mais intenso que notificação normal)
let alertAudio: HTMLAudioElement | null = null;

function playAlertSound() {
  if (!alertAudio) {
    // Beep mais longo e urgente
    alertAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6bl5GTi4eBfXx6fIKFhoiIh4eHh4eGhYaGhoaGhoaFhYWFhYaGhoaGhYWEhIOCgYB/f39/f3+AgIGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGAgH9+fXx7enl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXp6e3t8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/');
  }
  alertAudio.currentTime = 0;
  alertAudio.volume = 0.8;
  alertAudio.play().catch(() => {});
}

function showBrowserNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: 'whatsapp-disconnect',
      requireInteraction: true, // Não desaparece sozinha
    });
  }
}

export function useRealtimeWhatsAppStatus(onDisconnect?: () => void) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);
  const onDisconnectRef = useRef(onDisconnect);
  onDisconnectRef.current = onDisconnect;

  useEffect(() => {
    // Solicitar permissão para notificações
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel(`whatsapp_status_realtime_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
        },
        (payload) => {
          const newStatus = payload.new?.status as string;
          const oldStatus = payload.old?.status as string || previousStatusRef.current;

          // Detecta transição de conectado para desconectado
          if (oldStatus === 'connected' && (newStatus === 'disconnected' || newStatus === 'banned')) {
            // Toca som de alerta
            playAlertSound();

            // Toast persistente (não desaparece)
            toast.error('⚠️ WhatsApp Desconectado!', {
              description: 'Clique aqui para reconectar agora',
              duration: Infinity,
              id: 'whatsapp-disconnect-alert',
              action: {
                label: 'Reconectar',
                onClick: () => onDisconnectRef.current?.(),
              },
            });

            // Notificação do browser
            showBrowserNotification(
              '⚠️ WhatsApp Desconectado!',
              'Sua conexão com o WhatsApp foi perdida. Reconecte agora para não perder mensagens.'
            );

            // Callback
            onDisconnectRef.current?.();
          }

          // Detecta reconexão bem-sucedida
          if ((oldStatus === 'disconnected' || oldStatus === 'connecting') && newStatus === 'connected') {
            toast.dismiss('whatsapp-disconnect-alert');
            toast.success('✅ WhatsApp Reconectado!', {
              description: 'Sua conexão foi restabelecida com sucesso',
              duration: 5000,
            });
          }

          previousStatusRef.current = newStatus;
          
          // Invalida queries para atualizar UI
          queryClient.invalidateQueries({ queryKey: ['whatsapp-instance'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
