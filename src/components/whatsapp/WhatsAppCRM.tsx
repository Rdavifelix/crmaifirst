import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLeads, useLeadMessages, Lead } from '@/hooks/useLeads';
import { useSendWhatsAppMessage, useWhatsAppInstance } from '@/hooks/useWhatsAppInstance';
import { useRealtimeMessages, useRealtimeLeadMessages } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/hooks/useAuth';
import { useLeadIntelligence } from '@/hooks/useLeadIntelligence';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Send, Search, Check, CheckCheck, Loader2, WifiOff, Clock, MessageSquare, PanelLeftClose, PanelLeft, Bot, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LeadSmartHeader } from './LeadSmartHeader';
import { LeadSidePanel } from './LeadSidePanel';
import { LeadCard } from '@/components/leads/LeadCard';

interface LeadWithLastMessage extends Lead {
  lastMessage?: {
    message: string;
    created_at: string;
    sender_type: string;
    message_status?: string;
  };
  unreadCount: number;
}

// Hook to get all messages for ordering leads
function useAllLeadMessages() {
  return useQuery({
    queryKey: ['all-lead-messages-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_messages')
        .select('lead_id, message, created_at, sender_type, message_status, is_read')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5s as backup
  });
}

// Format timestamp like WhatsApp
function formatMessageTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) {
    return format(date, 'HH:mm');
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  // Within this week - show day name
  const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return format(date, 'EEEE', { locale: ptBR });
  }
  // Older - show date
  return format(date, 'dd/MM/yyyy');
}

// Format date separator like WhatsApp
function formatDateSeparator(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) {
    return 'Hoje';
  }
  if (isYesterday(date)) {
    return 'Ontem';
  }
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

// Message status indicator
function MessageStatus({ status, senderType }: { status?: string; senderType: string }) {
  if (senderType !== 'attendant') return null;
  
  switch (status) {
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-muted-foreground" />;
    case 'pending':
    default:
      return <Clock className="h-3 w-3 text-muted-foreground" />;
  }
}

export function WhatsAppCRM() {
  const { data: leads } = useLeads();
  const { data: allMessages } = useAllLeadMessages();
  const { data: whatsappInstance } = useWhatsAppInstance();
  const { user } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Lead Intelligence
  const intelligence = useLeadIntelligence(selectedLead);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const { data: messages, refetch: refetchMessages } = useLeadMessages(selectedLead?.id || '');
  const sendWhatsAppMessage = useSendWhatsAppMessage();

  const isConnected = whatsappInstance?.status === 'connected';

  // Enable realtime updates + notifications for all messages
  useRealtimeMessages({ showNotifications: true });
  
  // Enable realtime updates for the selected lead's messages
  useRealtimeLeadMessages(selectedLead?.id || '');

  // Process leads with last message and unread count, sorted by last activity
  const processedLeads = useMemo((): LeadWithLastMessage[] => {
    if (!leads) return [];
    
    const messagesByLead = new Map<string, typeof allMessages>();
    
    allMessages?.forEach(msg => {
      if (!messagesByLead.has(msg.lead_id)) {
        messagesByLead.set(msg.lead_id, []);
      }
      messagesByLead.get(msg.lead_id)!.push(msg);
    });

    const enrichedLeads = leads.map(lead => {
      const leadMessages = messagesByLead.get(lead.id) || [];
      const lastMessage = leadMessages[0]; // Already sorted desc
      const unreadCount = leadMessages.filter(
        m => m.sender_type === 'lead' && !m.is_read
      ).length;

      return {
        ...lead,
        lastMessage: lastMessage ? {
          message: lastMessage.message,
          created_at: lastMessage.created_at,
          sender_type: lastMessage.sender_type,
          message_status: lastMessage.message_status || undefined,
        } : undefined,
        unreadCount,
      };
    });

    // Sort by last message time (most recent first), then by created_at
    return enrichedLeads.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [leads, allMessages]);

  // Filter leads
  const filteredLeads = useMemo(() => {
    return processedLeads.filter(lead => 
      lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.lastMessage?.message?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [processedLeads, searchTerm]);

  // Group messages by date for separators
  const groupedMessages = useMemo(() => {
    if (!messages) return [];
    
    const groups: { date: string; messages: typeof messages }[] = [];
    let currentDate = '';
    
    messages.forEach(msg => {
      const msgDate = format(parseISO(msg.created_at), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msg.created_at, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    
    return groups;
  }, [messages]);

  // Smart scroll - only auto-scroll if user is at bottom
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 100;
    const atBottom = target.scrollHeight - target.scrollTop - target.clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Mark messages as read when selecting a lead
  useEffect(() => {
    if (!selectedLead?.id) return;
    
    const markAsRead = async () => {
      await supabase
        .from('lead_messages')
        .update({ is_read: true })
        .eq('lead_id', selectedLead.id)
        .eq('sender_type', 'lead')
        .eq('is_read', false);
    };
    
    markAsRead();
  }, [selectedLead?.id]);

  // Scroll to bottom when selecting a new lead
  useEffect(() => {
    setIsAtBottom(true);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 100);
  }, [selectedLead?.id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedLead || !user) return;

    if (!isConnected) {
      toast.error('WhatsApp não está conectado. Conecte primeiro na aba Comerciais.');
      return;
    }

    try {
      await sendWhatsAppMessage.mutateAsync({
        lead_id: selectedLead.id,
        message: newMessage.trim(),
      });
      setNewMessage('');
      setIsAtBottom(true);
      refetchMessages();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar mensagem');
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp CRM</h1>
          <p className="text-muted-foreground mt-1">
            Faça a gestão das suas conversas e acompanhe leads
          </p>
        </div>
      </div>

      <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-card">
        {/* Sidebar Colapsável - Lista de Conversas */}
        <motion.div 
          initial={false}
          animate={{ width: sidebarCollapsed ? 60 : 320 }}
          transition={{ duration: 0.2 }}
          className="border-r bg-card flex flex-col shrink-0"
        >
          {/* Header */}
          <div className="p-2 border-b bg-whatsapp-light flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="shrink-0"
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
            {!sidebarCollapsed && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/50 h-9"
                />
              </div>
            )}
          </div>

          {/* Lista de Leads */}
          <ScrollArea className="flex-1">
            {filteredLeads.map((lead) => (
              sidebarCollapsed ? (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={cn(
                    "w-full p-2 flex justify-center hover:bg-muted/50 transition-colors border-b border-border/50",
                    selectedLead?.id === lead.id && "bg-muted"
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {lead.avatar_url && <AvatarImage src={lead.avatar_url} />}
                      <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                        {(lead.name || '?').substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {lead.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {lead.unreadCount > 9 ? '9+' : lead.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  variant="chat"
                  isSelected={selectedLead?.id === lead.id}
                  showTemperature={true}
                  lastMessage={lead.lastMessage}
                  unreadCount={lead.unreadCount}
                  onClick={() => setSelectedLead(lead)}
                />
              )
            ))}

            {filteredLeads.length === 0 && !sidebarCollapsed && (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma conversa encontrada</p>
              </div>
            )}
          </ScrollArea>
        </motion.div>

        {/* Main - Chat Area */}
        {selectedLead ? (
          <div className="flex flex-1 min-w-0">
            {/* Chat Column */}
            <div className="flex flex-col flex-1 min-w-0 relative">
            {/* Smart Header - Nova Central de Inteligência */}
            <LeadSmartHeader 
              lead={selectedLead}
              intelligence={intelligence}
              onOpenDetails={() => setShowDetails(true)}
            />


            {/* Messages Area */}
            <ScrollArea 
              className="flex-1 p-4 bg-whatsapp-bg"
              onScrollCapture={handleScroll}
            >
              <div className="space-y-1">
                {groupedMessages.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Date Separator */}
                    <div className="flex justify-center my-4">
                      <span className="bg-card px-3 py-1 rounded-lg text-xs text-muted-foreground shadow-sm">
                        {formatDateSeparator(group.date)}
                      </span>
                    </div>

                    {/* Messages in this group */}
                    <div className="space-y-1">
                      {group.messages.map((msg, msgIndex) => {
                        const isSystem = msg.sender_type === 'system';
                        const isOutgoing = msg.sender_type === 'attendant' || msg.sender_type === 'ai_agent';
                        const showTail = msgIndex === 0 ||
                          group.messages[msgIndex - 1]?.sender_type !== msg.sender_type;

                        // System/internal messages - centered notification style
                        if (isSystem) {
                          const isError = msg.message?.toLowerCase().includes('erro') || msg.message?.toLowerCase().includes('falha') || msg.message?.toLowerCase().includes('error');
                          return (
                            <div key={msg.id} className="flex justify-center my-2">
                              <div className={cn(
                                "flex items-start gap-2 max-w-[85%] px-3 py-2 rounded-lg text-xs shadow-sm border",
                                isError
                                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                                  : "bg-muted/80 border-border/50 text-muted-foreground"
                              )}>
                                {isError ? (
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                ) : (
                                  <Bot className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                  <span className="text-[10px] opacity-60 mt-1 block">
                                    {format(parseISO(msg.created_at), 'HH:mm')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "flex",
                              isOutgoing ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm relative",
                                isOutgoing
                                  ? "bg-whatsapp-bubble-out"
                                  : "bg-whatsapp-bubble-in",
                                showTail && (isOutgoing ? "rounded-tr-none" : "rounded-tl-none")
                              )}
                            >
                              {/* AI agent label */}
                              {msg.sender_type === 'ai_agent' && showTail && (
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Bot className="h-3 w-3 text-primary" />
                                  <span className="text-[10px] font-medium text-primary">Agente IA</span>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                              <div className="flex items-center justify-end gap-1 mt-0.5 -mb-0.5">
                                <span className="text-[10px] text-muted-foreground/70">
                                  {format(parseISO(msg.created_at), 'HH:mm')}
                                </span>
                                <MessageStatus
                                  status={(msg as any).message_status}
                                  senderType={msg.sender_type}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Initial system message if no messages */}
                {groupedMessages.length === 0 && (
                  <div className="flex justify-center my-4">
                    <div className="bg-card/80 backdrop-blur px-4 py-2 rounded-lg text-xs text-muted-foreground shadow-sm max-w-sm text-center">
                      <p className="font-medium mb-1">Início da conversa</p>
                      <p>
                        Lead entrou em {format(parseISO(selectedLead.entered_at), "dd/MM/yyyy 'às' HH:mm")}
                        {selectedLead.utm_source && (
                          <span> via <strong>{selectedLead.utm_source}</strong></span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Scroll to bottom button */}
            {!isAtBottom && messages && messages.length > 5 && (
              <div className="absolute bottom-20 right-8">
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full shadow-lg h-10 w-10"
                  onClick={() => {
                    setIsAtBottom(true);
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </Button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t bg-whatsapp-light">
              {!isConnected && (
                <div className="flex items-center gap-2 text-destructive text-xs mb-2 bg-destructive/10 px-3 py-2 rounded-lg">
                  <WifiOff className="h-4 w-4" />
                   <span>WhatsApp desconectado. Conecte na aba Comerciais para enviar mensagens.</span>
                </div>
              )}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex gap-2 items-end"
              >
                <Input
                  placeholder="Digite uma mensagem"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-card border-0 focus-visible:ring-1"
                  disabled={!isConnected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="shrink-0 rounded-full h-10 w-10"
                  disabled={!newMessage.trim() || !isConnected || sendWhatsAppMessage.isPending}
                >
                  {sendWhatsAppMessage.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </div>
            </div>

            {/* Lead Side Panel - Painel Completo do Lead */}
            <LeadSidePanel
              lead={selectedLead}
              isCollapsed={aiPanelCollapsed}
              onToggle={() => setAiPanelCollapsed(!aiPanelCollapsed)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center h-full bg-gradient-to-b from-muted/30 to-muted/10">
            <div className="text-center space-y-4 max-w-md px-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 flex items-center justify-center mx-auto">
                <MessageSquare className="h-14 w-14 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-foreground">WhatsApp CRM</h3>
                <p className="text-muted-foreground mt-2">
                  Selecione uma conversa ao lado para ver as mensagens e interagir com seus leads
                </p>
              </div>
              {isConnected ? (
                <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm">WhatsApp conectado</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">WhatsApp desconectado</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
