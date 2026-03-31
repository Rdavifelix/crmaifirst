import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { CopilotConversation, CopilotMessage, CopilotAction } from '@/types/marketing';
import { useState, useCallback, useRef } from 'react';

// ── Conversations ────────────────────────────────────────
export function useConversations() {
  return useQuery({
    queryKey: ['marketing-copilot-conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_copilot_conversations')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as CopilotConversation[];
    },
  });
}

export function useConversation(id?: string) {
  return useQuery({
    queryKey: ['marketing-copilot-conversation', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_copilot_conversations')
        .select('*')
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as CopilotConversation;
    },
    enabled: !!id,
  });
}

// ── Create Conversation ──────────────────────────────────
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (title?: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Faça login novamente.');
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', session.user.id).single();
      if (!profile?.id) throw new Error('Perfil não encontrado');

      const { data, error } = await supabase
        .from('marketing_copilot_conversations')
        .insert({
          profile_id: profile.id,
          title: title || 'Nova conversa',
          messages: [],
          context: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as CopilotConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-copilot-conversations'] });
    },
  });
}

// ── Send Message (with streaming) ────────────────────────
export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState('');
  const [pendingAction, setPendingAction] = useState<CopilotAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async ({
    conversationId,
    message,
    accountId,
  }: {
    conversationId: string;
    message: string;
    accountId?: string;
  }) => {
    setIsStreaming(true);
    setStreamedResponse('');
    setPendingAction(null);

    try {
      // Add user message to conversation
      const { data: conversation } = await supabase
        .from('marketing_copilot_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();

      const currentMessages = (conversation?.messages as CopilotMessage[]) || [];
      const userMessage: CopilotMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...currentMessages, userMessage];

      await supabase
        .from('marketing_copilot_conversations')
        .update({ messages: updatedMessages as any, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Call edge function
      const { data, error } = await supabase.functions.invoke('marketing-copilot', {
        body: {
          conversation_id: conversationId,
          message,
          account_id: accountId,
          history: updatedMessages.slice(-10),
        },
      });

      if (error) throw error;

      const assistantContent = data?.response || data?.message || 'Sem resposta';
      const action = data?.action || null;

      setStreamedResponse(assistantContent);
      if (action) setPendingAction(action);

      // Save assistant response
      const assistantMessage: CopilotMessage = {
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        action,
      };

      await supabase
        .from('marketing_copilot_conversations')
        .update({
          messages: [...updatedMessages, assistantMessage] as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      queryClient.invalidateQueries({ queryKey: ['marketing-copilot-conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-copilot-conversations'] });

      return { response: assistantContent, action };
    } catch (error: any) {
      toast({ title: 'Erro no copilot', description: error.message, variant: 'destructive' });
      throw error;
    } finally {
      setIsStreaming(false);
    }
  }, [queryClient, toast]);

  const confirmAction = useCallback(async (conversationId: string, action: CopilotAction) => {
    try {
      const { data, error } = await supabase.functions.invoke('marketing-copilot', {
        body: {
          conversation_id: conversationId,
          action_confirm: true,
          action,
        },
      });

      if (error) throw error;

      setPendingAction(null);
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-creatives'] });
      toast({ title: 'Ação executada com sucesso!' });

      return data;
    } catch (error: any) {
      toast({ title: 'Erro ao executar ação', description: error.message, variant: 'destructive' });
      throw error;
    }
  }, [queryClient, toast]);

  const cancelStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    sendMessage,
    confirmAction,
    cancelStreaming,
    isStreaming,
    streamedResponse,
    pendingAction,
  };
}
