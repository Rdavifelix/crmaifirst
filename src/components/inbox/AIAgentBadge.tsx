import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bot,
  Pause,
  Play,
  Power,
  Loader2,
  Zap,
  ChevronDown,
  Clock,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import {
  useAIAgentStatusForLead,
  useToggleAIAgentConversation,
  useTestAIAgent,
  useAIAgentConversation,
  useAIAgentLogs,
  useAIAgents,
} from "@/hooks/useAISalesAgent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIAgentBadgeProps {
  leadId: string;
  compact?: boolean;
}

export function AIAgentBadge({ leadId, compact = false }: AIAgentBadgeProps) {
  const { data: status, isLoading } = useAIAgentStatusForLead(leadId);
  const { data: conversation } = useAIAgentConversation(leadId);
  const { data: logs } = useAIAgentLogs(conversation?.id, 5);
  const toggleConversation = useToggleAIAgentConversation();
  const testAgent = useTestAIAgent();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  const hasAgent = status?.has_agent;
  const isPaused = status?.is_paused;
  const conversationStatus = status?.conversation_status;

  const getStatusColor = () => {
    if (!hasAgent) return "secondary";
    if (isPaused) return "outline";
    if (conversationStatus === "transferred") return "destructive";
    return "default";
  };

  const getStatusIcon = () => {
    if (!hasAgent) return <Power className="h-3 w-3" />;
    if (isPaused) return <Pause className="h-3 w-3" />;
    if (conversationStatus === "transferred") return <AlertCircle className="h-3 w-3" />;
    return <Bot className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (!hasAgent) return "IA Off";
    if (isPaused) return "IA Pausada";
    if (conversationStatus === "transferred") return "Transferido";
    return "IA Ativa";
  };

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Badge
            variant={getStatusColor()}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end" onPointerDownOutside={(e) => e.preventDefault()}>
          <AgentPopoverContent
            leadId={leadId}
            status={status}
            conversation={conversation}
            logs={logs}
            toggleConversation={toggleConversation}
            testAgent={testAgent}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {getStatusIcon()}
          {getStatusText()}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" onPointerDownOutside={(e) => e.preventDefault()}>
        <AgentPopoverContent
          leadId={leadId}
          status={status}
          conversation={conversation}
          logs={logs}
          toggleConversation={toggleConversation}
          testAgent={testAgent}
        />
      </PopoverContent>
    </Popover>
  );
}

function AgentPopoverContent({
  leadId,
  status,
  conversation,
  logs,
  toggleConversation,
  testAgent,
}: {
  leadId: string;
  status: any;
  conversation: any;
  logs: any[];
  toggleConversation: any;
  testAgent: any;
}) {
  const hasAgent = status?.has_agent;
  const isPaused = status?.is_paused;
  const conversationStatus = status?.conversation_status;
  const isProcessing = toggleConversation.isPending || testAgent.isPending;
  const { data: agents } = useAIAgents();
  const [selectedAgentId, setSelectedAgentId] = useState("");

  // Pre-select first active agent
  const activeAgents = (agents || []).filter(a => a.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-1.5">
          <Bot className="h-4 w-4" />
          Agente IA
        </h4>
        {status?.agent_name && (
          <span className="text-xs text-muted-foreground">{status.agent_name}</span>
        )}
      </div>

      {/* Stats */}
      {hasAgent && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>{status?.messages_sent || 0} msgs enviadas</span>
          </div>
          {status?.last_processed_at && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {new Date(status.last_processed_at).toLocaleString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pause reason */}
      {isPaused && status?.pause_reason && (
        <div className="text-xs p-2 bg-muted rounded">
          <span className="font-medium">Motivo:</span> {status.pause_reason}
          {status?.paused_by_name && (
            <span className="text-muted-foreground"> por {status.paused_by_name}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        {!hasAgent && (
          <>
            {activeAgents.length > 1 && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Escolher agente:</span>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecionar agente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAgents.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-1.5">
                          <Bot className="h-3 w-3" />
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              size="sm"
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const agentId = selectedAgentId || activeAgents[0]?.id;
                if (!agentId) return;
                toggleConversation.mutate({ leadId, action: "activate", agentId });
              }}
              disabled={isProcessing || (activeAgents.length > 1 && !selectedAgentId && activeAgents.length > 0)}
              className="w-full"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Power className="h-4 w-4 mr-1" />
              )}
              Ativar Agente IA
            </Button>
          </>
        )}

        {hasAgent && !isPaused && conversationStatus === "active" && (
          <>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); toggleConversation.mutate({ leadId, action: "pause" }); }}
              disabled={isProcessing}
              className="w-full"
            >
              <Pause className="h-4 w-4 mr-1" />
              Pausar Agente
            </Button>
            <Button
              size="sm"
              type="button"
              variant="outline"
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); testAgent.mutate({ leadId }); }}
              disabled={isProcessing}
              className="w-full"
            >
              {testAgent.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Forçar Processamento
            </Button>
          </>
        )}

        {hasAgent && (isPaused || conversationStatus === "transferred") && (
          <Button
            size="sm"
            type="button"
            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); toggleConversation.mutate({ leadId, action: "resume" }); }}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Play className="h-4 w-4 mr-1" />
            )}
            Retomar Agente
          </Button>
        )}
      </div>

      {/* Recent logs */}
      {logs && logs.length > 0 && (
        <div className="border-t pt-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">Atividade recente:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {logs.slice(0, 3).map((log) => (
              <div key={log.id} className="text-xs flex items-start gap-1.5">
                <span className="text-muted-foreground shrink-0">
                  {new Date(log.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>
                  {log.log_type === "message_sent"
                    ? "Mensagem enviada"
                    : log.log_type === "tool_called"
                      ? `Tool: ${(log.data as any)?.tool || "?"}`
                      : log.log_type === "transfer"
                        ? "Transferido para humano"
                        : log.log_type === "outside_hours"
                          ? "Fora do horário"
                          : log.log_type === "rate_limit"
                            ? "Rate limit atingido"
                            : log.log_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
