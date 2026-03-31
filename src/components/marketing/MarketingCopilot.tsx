import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Send,
  Plus,
  X,
  Loader2,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useSendMessage,
} from '@/hooks/useMarketingCopilot';
import { CopilotMessageBubble } from './CopilotMessageBubble';
import { CopilotActionCard } from './CopilotActionCard';
import type { CopilotMessage, CopilotAction } from '@/types/marketing';

interface MarketingCopilotProps {
  accountId?: string;
}

export function MarketingCopilot({ accountId }: MarketingCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { data: conversations, isLoading: loadingConversations } = useConversations();
  const { data: activeConversation } = useConversation(conversationId);
  const createConversation = useCreateConversation();
  const {
    sendMessage,
    confirmAction,
    isStreaming,
    streamedResponse,
    pendingAction,
  } = useSendMessage();

  // Messages from active conversation
  const messages: CopilotMessage[] =
    (activeConversation?.messages as CopilotMessage[]) || [];

  // Auto-scroll to bottom when messages change or streaming updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, streamedResponse, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!conversationId && conversations && conversations.length > 0) {
      setConversationId(conversations[0].id);
    }
  }, [conversations, conversationId]);

  // Handle sending a message
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    setInputValue('');

    let targetConversationId = conversationId;

    // Auto-create conversation if none exists
    if (!targetConversationId) {
      try {
        const newConv = await createConversation.mutateAsync(
          text.slice(0, 50),
        );
        targetConversationId = newConv.id;
        setConversationId(newConv.id);
      } catch {
        return;
      }
    }

    await sendMessage({
      conversationId: targetConversationId,
      message: text,
      accountId,
    });
  }, [inputValue, isStreaming, conversationId, accountId, createConversation, sendMessage]);

  // Handle confirm action
  const handleConfirmAction = useCallback(
    async (action: CopilotAction) => {
      if (!conversationId) return;
      await confirmAction(conversationId, action);
    },
    [conversationId, confirmAction],
  );

  // Handle new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      const newConv = await createConversation.mutateAsync();
      setConversationId(newConv.id);
    } catch {
      // toast is handled inside the hook
    }
  }, [createConversation]);

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg relative group"
              onClick={() => setIsOpen(true)}
            >
              <Sparkles className="h-6 w-6" />
              {/* Pulse animation */}
              <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="w-[400px] h-[500px] flex flex-col shadow-2xl border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold leading-none">
                      Copiloto de Marketing
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      IA para campanhas e criativos
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Conversation selector */}
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <Select
                  value={conversationId || ''}
                  onValueChange={(val) => setConversationId(val)}
                >
                  <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                    <SelectValue placeholder="Selecionar conversa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingConversations ? (
                      <SelectItem value="_loading" disabled>
                        Carregando...
                      </SelectItem>
                    ) : conversations && conversations.length > 0 ? (
                      conversations.map((conv) => (
                        <SelectItem key={conv.id} value={conv.id}>
                          <span className="truncate">{conv.title}</span>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="_empty" disabled>
                        Nenhuma conversa
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleNewConversation}
                  disabled={createConversation.isPending}
                >
                  {createConversation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1 px-3 py-3" ref={scrollRef}>
                <div ref={scrollRef}>
                  {messages.length === 0 && !isStreaming ? (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center h-[280px] text-center px-6">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <MessageCircle className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-sm font-medium mb-1">
                        Ola! Sou seu copiloto de marketing.
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Posso criar campanhas, gerar criativos, analisar
                        metricas e muito mais. O que deseja fazer?
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {[
                          'Criar campanha',
                          'Gerar criativo',
                          'Ver metricas',
                        ].map((suggestion) => (
                          <Badge
                            key={suggestion}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                            onClick={() => {
                              setInputValue(suggestion);
                              inputRef.current?.focus();
                            }}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Message list */
                    <>
                      {messages.map((msg, index) => (
                        <CopilotMessageBubble
                          key={`${msg.timestamp}-${index}`}
                          message={msg}
                          onConfirmAction={handleConfirmAction}
                        />
                      ))}

                      {/* Streaming indicator */}
                      {isStreaming && (
                        <div className="flex gap-2 mb-3">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                          </div>
                          <div className="flex flex-col items-start max-w-[80%]">
                            {streamedResponse ? (
                              <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-muted text-foreground text-sm leading-relaxed whitespace-pre-wrap">
                                {streamedResponse}
                              </div>
                            ) : (
                              <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-muted">
                                <div className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:0ms]" />
                                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
                                  <span className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending action card (outside messages) */}
                      {pendingAction && !isStreaming && (
                        <div className="px-2 mb-3">
                          <CopilotActionCard
                            action={pendingAction}
                            onConfirm={() => handleConfirmAction(pendingAction)}
                            onCancel={() => {}}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Input area */}
              <div className="px-3 py-3 border-t bg-card">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 h-9 text-sm"
                    disabled={isStreaming}
                  />
                  <Button
                    size="icon"
                    className={cn('h-9 w-9 shrink-0')}
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isStreaming}
                  >
                    {isStreaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
