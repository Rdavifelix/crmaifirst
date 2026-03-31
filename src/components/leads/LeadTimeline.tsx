import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Lead, LeadStatusHistory, LeadMessage } from '@/hooks/useLeads';
import { LeadTask, useLeadTasks } from '@/hooks/useLeadTasks';
import { LEAD_STATUSES, LeadStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  MessageCircle,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Sparkles,
  Target,
  User,
  Mic,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Zap,
  FileText,
  Video,
  CheckSquare,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface CallRecord {
  id: string;
  direction: string;
  status: string;
  peer_phone: string;
  peer_name: string | null;
  duration_seconds: number | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  transcription: string | null;
  transcriptions: any[] | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  ai_key_points: any[] | null;
  ai_suggested_tasks: any[] | null;
}

interface TimelineEvent {
  id: string;
  type: 'entry' | 'status_change' | 'call' | 'message_batch' | 'task';
  timestamp: string;
  data: any;
}

interface LeadTimelineProps {
  lead: Lead;
  statusHistory: LeadStatusHistory[] | undefined;
  messages: LeadMessage[] | undefined;
}

function useLeadCalls(leadId: string) {
  return useQuery({
    queryKey: ['lead-calls', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('call_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CallRecord[];
    },
    enabled: !!leadId,
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}min ${s}s`;
}

// Build unified timeline events
function buildTimeline(
  lead: Lead,
  statusHistory: LeadStatusHistory[] | undefined,
  messages: LeadMessage[] | undefined,
  calls: CallRecord[] | undefined,
  tasks: LeadTask[] | undefined
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Lead entry event
  events.push({
    id: 'entry',
    type: 'entry',
    timestamp: lead.entered_at || lead.created_at,
    data: { lead },
  });

  // 2. Status changes
  statusHistory?.forEach((h) => {
    events.push({
      id: `status-${h.id}`,
      type: 'status_change',
      timestamp: h.created_at,
      data: h,
    });
  });

  // 3. Calls
  calls?.forEach((c) => {
    events.push({
      id: `call-${c.id}`,
      type: 'call',
      timestamp: c.started_at || c.created_at,
      data: c,
    });
  });

  // 4. Tasks / Meetings / Calls
  tasks?.forEach((t) => {
    events.push({
      id: `task-${t.id}`,
      type: 'task',
      timestamp: t.scheduled_at || t.created_at,
      data: t,
    });
  });

  // 5. Messages – group by day to avoid flooding
  if (messages && messages.length > 0) {
    const byDay: Record<string, LeadMessage[]> = {};
    messages.forEach((msg) => {
      const day = format(parseISO(msg.created_at), 'yyyy-MM-dd');
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(msg);
    });
    Object.entries(byDay).forEach(([day, msgs]) => {
      events.push({
        id: `msgs-${day}`,
        type: 'message_batch',
        timestamp: msgs[0].created_at,
        data: { day, messages: msgs },
      });
    });
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

// --- Sub-components ---

function EntryEvent({ lead }: { lead: Lead }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Lead entrou no funil</p>
      {(lead.utm_source || lead.utm_medium || lead.utm_campaign) && (
        <div className="flex flex-wrap gap-1.5">
          {lead.utm_source && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Globe className="h-3 w-3" />
              {lead.utm_source}
            </Badge>
          )}
          {lead.utm_medium && (
            <Badge variant="outline" className="text-xs">
              {lead.utm_medium}
            </Badge>
          )}
          {lead.utm_campaign && (
            <Badge variant="outline" className="text-xs">
              📢 {lead.utm_campaign}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

function StatusChangeEvent({ history }: { history: LeadStatusHistory }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        {history.old_status && (
          <>
            <Badge variant="outline" className="text-xs">
              {LEAD_STATUSES[history.old_status as LeadStatus]?.label || history.old_status}
            </Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </>
        )}
        <Badge className="text-xs bg-primary text-primary-foreground">
          {LEAD_STATUSES[history.new_status as LeadStatus]?.label || history.new_status}
        </Badge>
      </div>
      {history.notes && (
        <p className="text-xs text-muted-foreground italic">{history.notes}</p>
      )}
    </div>
  );
}

function CallEvent({ call }: { call: CallRecord }) {
  const [open, setOpen] = useState(false);
  const isOutgoing = call.direction === 'OUTGOING';
  const hasAnalysis = !!(call.ai_summary || (call.ai_key_points && (call.ai_key_points as any[]).length > 0));
  const hasTranscription = !!(call.transcription || (call.transcriptions && (call.transcriptions as any[]).length > 0));

  const sentimentConfig: Record<string, { label: string; color: string }> = {
    positive: { label: 'Positivo', color: 'text-emerald-600 bg-emerald-500/10' },
    negative: { label: 'Negativo', color: 'text-red-600 bg-red-500/10' },
    neutral: { label: 'Neutro', color: 'text-amber-600 bg-amber-500/10' },
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left space-y-1.5 group">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium flex-1">
              {isOutgoing ? 'Ligação realizada' : 'Ligação recebida'}
              {call.peer_name && <span className="text-muted-foreground"> — {call.peer_name}</span>}
            </p>
            <div className="flex items-center gap-1.5">
              {call.duration_seconds && call.duration_seconds > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(call.duration_seconds)}
                </Badge>
              )}
              {hasAnalysis && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Brain className="h-3 w-3" />
                  IA
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )} />
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              call.status === 'ENDED' && 'border-emerald-500/30 text-emerald-600',
              call.status === 'MISSED' && 'border-red-500/30 text-red-600',
              call.status === 'CALLING' && 'border-amber-500/30 text-amber-600',
            )}
          >
            {call.status === 'ENDED' ? 'Finalizada' : call.status === 'MISSED' ? 'Perdida' : call.status}
          </Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-3 space-y-3 border-t pt-3">
          {/* AI Summary */}
          {call.ai_summary && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Diagnóstico IA
              </p>
              <p className="text-sm">{call.ai_summary}</p>
            </div>
          )}

          {/* Sentiment */}
          {call.ai_sentiment && (
            <div className="flex items-center gap-2">
              <Badge className={cn("text-xs", sentimentConfig[call.ai_sentiment]?.color)}>
                {sentimentConfig[call.ai_sentiment]?.label || call.ai_sentiment}
              </Badge>
            </div>
          )}

          {/* Key Points */}
          {call.ai_key_points && (call.ai_key_points as any[]).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Pontos-chave
              </p>
              <div className="space-y-1">
                {(call.ai_key_points as string[]).map((point, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Tasks */}
          {call.ai_suggested_tasks && (call.ai_suggested_tasks as any[]).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Tarefas Sugeridas
              </p>
              <div className="space-y-1">
                {(call.ai_suggested_tasks as any[]).map((task: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-500/5">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
                    <span>{typeof task === 'string' ? task : task.titulo || task.title || JSON.stringify(task)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transcription preview */}
          {hasTranscription && (
            <TranscriptionPreview call={call} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TranscriptionPreview({ call }: { call: CallRecord }) {
  const [showFull, setShowFull] = useState(false);

  // Parse transcriptions array or plain text
  const segments = useMemo(() => {
    if (call.transcriptions && Array.isArray(call.transcriptions) && call.transcriptions.length > 0) {
      return call.transcriptions as Array<{ speaker: string; text: string; is_final?: boolean }>;
    }
    if (call.transcription) {
      return [{ speaker: 'Transcrição', text: call.transcription }];
    }
    return [];
  }, [call.transcriptions, call.transcription]);

  const finalSegments = segments.filter((s: any) => s.is_final !== false);
  const preview = finalSegments.slice(0, 4);
  const hasMore = finalSegments.length > 4;

  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Mic className="h-3 w-3" />
        Transcrição
      </p>
      <div className="space-y-1.5 text-sm">
        {(showFull ? finalSegments : preview).map((seg, i) => (
          <div key={i} className="flex gap-2">
            <span className={cn(
              "text-xs font-semibold shrink-0 w-16 text-right",
              seg.speaker?.includes('Voce') || seg.speaker?.includes('Você') 
                ? 'text-blue-600' 
                : 'text-muted-foreground'
            )}>
              {seg.speaker}:
            </span>
            <span className="text-muted-foreground">{seg.text}</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowFull(!showFull)}>
          {showFull ? 'Ver menos' : `Ver tudo (${finalSegments.length} segmentos)`}
        </Button>
      )}
    </div>
  );
}

function MessageBatchEvent({ day, messages }: { day: string; messages: LeadMessage[] }) {
  const [open, setOpen] = useState(false);
  const inCount = messages.filter((m) => m.sender_type === 'lead').length;
  const outCount = messages.filter((m) => m.sender_type !== 'lead').length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full text-left group">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium flex-1">
              {messages.length} mensagen{messages.length > 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1.5">
              {inCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {inCount} recebida{inCount > 1 ? 's' : ''}
                </Badge>
              )}
              {outCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {outCount} enviada{outCount > 1 ? 's' : ''}
                </Badge>
              )}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                open && "rotate-180"
              )} />
            </div>
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "p-2 rounded-lg text-xs max-w-[85%]",
                msg.sender_type === 'lead'
                  ? 'bg-muted'
                  : 'bg-primary/10 ml-auto'
              )}
            >
              <p>{msg.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {format(parseISO(msg.created_at), 'HH:mm', { locale: ptBR })}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TaskEvent({ task }: { task: LeadTask }) {
  const typeLabels: Record<string, string> = {
    meeting: 'Reunião agendada',
    call: 'Ligação agendada',
    task: 'Tarefa criada',
  };
  const priorityLabels: Record<string, { label: string; color: string }> = {
    high: { label: 'Alta', color: 'text-red-600 bg-red-500/10' },
    medium: { label: 'Média', color: 'text-amber-600 bg-amber-500/10' },
    low: { label: 'Baixa', color: 'text-muted-foreground bg-muted' },
  };
  const prio = priorityLabels[task.priority] || priorityLabels.medium;

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {typeLabels[task.type] || 'Tarefa criada'}
      </p>
      <p className="text-sm">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={task.status === 'completed' ? 'default' : 'outline'} className="text-xs">
          {task.status === 'completed' ? 'Concluída' : task.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
        </Badge>
        <Badge variant="outline" className={cn("text-xs", prio.color)}>
          {prio.label}
        </Badge>
        {task.duration_minutes > 0 && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {task.duration_minutes >= 60
              ? `${Math.floor(task.duration_minutes / 60)}h${task.duration_minutes % 60 > 0 ? task.duration_minutes % 60 + 'min' : ''}`
              : `${task.duration_minutes}min`}
          </Badge>
        )}
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground italic">{task.description}</p>
      )}
    </div>
  );
}

// --- Icon config for timeline ---
const typeConfig = {
  entry: { icon: User, color: 'bg-blue-500 text-white', label: 'Entrada' },
  status_change: { icon: ArrowRight, color: 'bg-purple-500 text-white', label: 'Mudança' },
  call: { icon: Phone, color: 'bg-emerald-500 text-white', label: 'Ligação' },
  message_batch: { icon: MessageCircle, color: 'bg-amber-500 text-white', label: 'Mensagens' },
  task: { icon: CheckSquare, color: 'bg-indigo-500 text-white', label: 'Tarefa' },
};

// --- Main component ---
export function LeadTimeline({ lead, statusHistory, messages }: LeadTimelineProps) {
  const { data: calls } = useLeadCalls(lead.id);
  const { data: tasks } = useLeadTasks(lead.id);

  const events = useMemo(
    () => buildTimeline(lead, statusHistory, messages, calls, tasks),
    [lead, statusHistory, messages, calls, tasks]
  );

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        Nenhum evento registrado
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <AnimatePresence>
        {events.map((event, index) => {
          const config = typeConfig[event.type];
          const Icon = event.type === 'call'
            ? (event.data.direction === 'OUTGOING' ? PhoneOutgoing : PhoneIncoming)
            : event.type === 'task'
            ? (event.data.type === 'meeting' ? Video : event.data.type === 'call' ? Phone : CheckSquare)
            : config.icon;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex gap-3 group"
            >
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                  config.color
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                {index < events.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border min-h-[16px]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <Card className="p-3 border shadow-sm hover:shadow-md transition-shadow">
                  {/* Timestamp header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(event.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({formatDistanceToNow(parseISO(event.timestamp), { locale: ptBR, addSuffix: true })})
                    </span>
                  </div>

                  {/* Event content */}
                  {event.type === 'entry' && <EntryEvent lead={event.data.lead} />}
                  {event.type === 'status_change' && <StatusChangeEvent history={event.data} />}
                  {event.type === 'call' && <CallEvent call={event.data} />}
                  {event.type === 'task' && <TaskEvent task={event.data} />}
                  {event.type === 'message_batch' && (
                    <MessageBatchEvent day={event.data.day} messages={event.data.messages} />
                  )}
                </Card>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
