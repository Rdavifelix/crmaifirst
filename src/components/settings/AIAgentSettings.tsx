import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Bot, Brain, Clock, MessageSquare, Settings2, Zap, Plus, Trash2, Save,
  Loader2, Power, ChevronDown, ChevronUp, Wrench, GitBranch, BarChart3,
  AlertCircle, CheckCircle2, XCircle, RefreshCw, Pencil,
} from "lucide-react";
import {
  useAIAgents,
  useSaveAIAgent,
  useToggleAIAgent,
  useAIAgentTools,
  useSaveAIAgentTool,
  useDeleteAIAgentTool,
  useAIAgentDashboard,
  usePipelineStages,
  useSavePipelineStage,
  useDeletePipelineStage,
  useCadenceEnrollments,
  useCancelCadenceEnrollment,
  DEFAULT_AGENT_SETTINGS,
  type AISalesAgent,
  type AIAgentTool,
  type AIAgentSettings,
  type CadenceStep,
  type PipelineStage,
} from "@/hooks/useAISalesAgent";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

// ============================================
// Default Tools (pre-configured)
// ============================================

const DEFAULT_TOOLS: Omit<AIAgentTool, "id" | "agent_id" | "created_at" | "updated_at">[] = [
  {
    name: "qualify_lead",
    description: "Registra dados de qualificação do lead. Use quando o lead mencionar empresa, faturamento, funcionários ou desafios.",
    parameters: {
      type: "object",
      properties: {
        company_name: { type: "string", description: "Nome da empresa" },
        employee_count: { type: "string", description: "Quantidade de funcionários" },
        monthly_revenue: { type: "string", description: "Faturamento mensal" },
        challenges: { type: "string", description: "Desafios do lead" },
        budget: { type: "string", description: "Orçamento disponível" },
        authority: { type: "string", description: "Quem decide a compra" },
        need: { type: "string", description: "Necessidade identificada" },
        timeline: { type: "string", description: "Prazo para decisão" },
      },
      required: [],
    },
    action_type: "qualify_bant",
    action_config: {},
    priority: 0,
    is_active: true,
  },
  {
    name: "update_lead",
    description: "Atualiza dados do lead como nome, email ou Instagram.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do lead" },
        email: { type: "string", description: "Email do lead" },
        instagram_username: { type: "string", description: "Username do Instagram" },
      },
      required: [],
    },
    action_type: "update_lead",
    action_config: {},
    priority: 1,
    is_active: true,
  },
  {
    name: "check_availability",
    description: "Verifica horários disponíveis na agenda para uma data específica.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data para verificar (YYYY-MM-DD)" },
      },
      required: ["date"],
    },
    action_type: "check_availability",
    action_config: {},
    priority: 2,
    is_active: true,
  },
  {
    name: "schedule_meeting",
    description: "Agenda uma reunião com o lead.",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Data da reunião (YYYY-MM-DD)" },
        time: { type: "string", description: "Horário (HH:MM)" },
        email: { type: "string", description: "Email do lead para enviar convite" },
      },
      required: ["date", "time"],
    },
    action_type: "schedule_meeting",
    action_config: {},
    priority: 3,
    is_active: true,
  },
  {
    name: "reschedule_meeting",
    description: "Reagenda ou cancela uma reunião existente.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "reschedule ou cancel" },
        new_date: { type: "string", description: "Nova data (YYYY-MM-DD)" },
        new_time: { type: "string", description: "Novo horário (HH:MM)" },
      },
      required: ["action"],
    },
    action_type: "reschedule_meeting",
    action_config: {},
    priority: 4,
    is_active: true,
  },
  {
    name: "confirm_meeting",
    description: "Confirma a presença do lead na reunião agendada.",
    parameters: { type: "object", properties: {}, required: [] },
    action_type: "confirm_meeting",
    action_config: {},
    priority: 5,
    is_active: true,
  },
  {
    name: "change_stage",
    description: "Move o lead para outro estágio do funil de vendas.",
    parameters: {
      type: "object",
      properties: {
        stage: { type: "string", description: "Nome do estágio de destino" },
      },
      required: ["stage"],
    },
    action_type: "change_stage",
    action_config: {},
    priority: 6,
    is_active: true,
  },
  {
    name: "notify_human",
    description: "Transfere a conversa para um atendente humano quando necessário.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo da transferência" },
        urgency: { type: "string", description: "normal ou urgent" },
      },
      required: ["reason"],
    },
    action_type: "notify_human",
    action_config: {},
    priority: 7,
    is_active: true,
  },
  {
    name: "mark_lost",
    description: "Marca o lead como perdido quando não há interesse.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Motivo da perda" },
      },
      required: ["reason"],
    },
    action_type: "mark_lost",
    action_config: {},
    priority: 8,
    is_active: true,
  },
  {
    name: "schedule_followup",
    description: "Agenda um follow-up para o futuro.",
    parameters: {
      type: "object",
      properties: {
        delay_minutes: { type: "number", description: "Minutos para agendar" },
        context_note: { type: "string", description: "Nota de contexto" },
      },
      required: ["delay_minutes"],
    },
    action_type: "schedule_followup",
    action_config: {},
    priority: 9,
    is_active: true,
  },
];

// ============================================
// Sub-components
// ============================================

function DashboardCard() {
  const { data: dashboard, isLoading } = useAIAgentDashboard();

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  const stats = dashboard?.[0];
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.active_conversations}</div>
          <p className="text-xs text-muted-foreground">Conversas Ativas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.total_messages_sent}</div>
          <p className="text-xs text-muted-foreground">Mensagens Enviadas</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold">{stats.pending_in_queue}</div>
          <p className="text-xs text-muted-foreground">Na Fila</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="text-2xl font-bold text-orange-500">{stats.paused_conversations}</div>
          <p className="text-xs text-muted-foreground">Pausadas</p>
        </CardContent>
      </Card>
    </div>
  );
}

function PipelineStagesManager() {
  const { data: stages, isLoading } = usePipelineStages();
  const saveMutation = useSavePipelineStage();
  const deleteMutation = useDeletePipelineStage();
  const [newStageName, setNewStageName] = useState("");
  const [newStageDisplay, setNewStageDisplay] = useState("");

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Estágios do Funil
        </CardTitle>
        <CardDescription>
          Configure os estágios do seu funil de vendas. O agente IA usa esses estágios para saber em que momento o lead está.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {(stages || []).map((stage) => (
            <div key={stage.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Badge variant={stage.is_terminal ? "destructive" : "default"}>
                  {stage.sort_order + 1}
                </Badge>
                <div>
                  <span className="font-medium">{stage.display_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">({stage.name})</span>
                </div>
                {stage.is_terminal && (
                  <Badge variant="outline" className="text-xs">Terminal</Badge>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate(stage.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Input
            placeholder="ID do estágio (ex: qualificado)"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
            className="flex-1"
          />
          <Input
            placeholder="Nome de exibição (ex: Qualificado)"
            value={newStageDisplay}
            onChange={(e) => setNewStageDisplay(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={() => {
              if (newStageName && newStageDisplay) {
                saveMutation.mutate({
                  name: newStageName,
                  display_name: newStageDisplay,
                  sort_order: (stages?.length || 0),
                });
                setNewStageName("");
                setNewStageDisplay("");
              }
            }}
            disabled={!newStageName || !newStageDisplay || saveMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ToolEditModal({ tool, agentId, open, onClose }: {
  tool: AIAgentTool | null;
  agentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const saveTool = useSaveAIAgentTool();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState('');
  const [parametersJson, setParametersJson] = useState('');
  const [actionConfigJson, setActionConfigJson] = useState('');
  const [priority, setPriority] = useState(0);
  const [jsonError, setJsonError] = useState('');

  React.useEffect(() => {
    if (tool) {
      setName(tool.name);
      setDescription(tool.description);
      setActionType(tool.action_type);
      setParametersJson(JSON.stringify(tool.parameters, null, 2));
      setActionConfigJson(JSON.stringify(tool.action_config, null, 2));
      setPriority(tool.priority);
    } else {
      setName('');
      setDescription('');
      setActionType('');
      setParametersJson('{\n  "type": "object",\n  "properties": {},\n  "required": []\n}');
      setActionConfigJson('{}');
      setPriority(0);
    }
    setJsonError('');
  }, [tool, open]);

  const handleSave = () => {
    let params: Record<string, unknown>;
    let config: Record<string, unknown>;
    try {
      params = JSON.parse(parametersJson);
      config = JSON.parse(actionConfigJson);
    } catch {
      setJsonError('JSON inválido nos parâmetros ou configuração');
      return;
    }

    if (!name.trim() || !description.trim() || !actionType.trim()) {
      setJsonError('Nome, descrição e tipo de ação são obrigatórios');
      return;
    }

    saveTool.mutate({
      ...(tool ? { id: tool.id } : {}),
      agent_id: agentId,
      name: name.trim(),
      description: description.trim(),
      action_type: actionType.trim(),
      parameters: params,
      action_config: config,
      priority,
      is_active: tool?.is_active ?? true,
    } as any, {
      onSuccess: () => {
        toast.success(tool ? 'Ferramenta atualizada!' : 'Ferramenta criada!');
        onClose();
      },
      onError: () => toast.error('Erro ao salvar ferramenta'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool ? 'Editar Ferramenta' : 'Nova Ferramenta'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Nome (identificador) *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="ex: check_availability" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo de ação *</Label>
              <Input value={actionType} onChange={e => setActionType(e.target.value)} placeholder="ex: check_availability" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição (o agente lê isso para decidir quando usar) *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o que a ferramenta faz..." className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Parâmetros (JSON Schema)</Label>
            <Textarea
              value={parametersJson}
              onChange={e => { setParametersJson(e.target.value); setJsonError(''); }}
              className="min-h-[120px] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Configuração da ação (JSON)</Label>
            <Textarea
              value={actionConfigJson}
              onChange={e => { setActionConfigJson(e.target.value); setJsonError(''); }}
              className="min-h-[60px] font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5 w-32">
            <Label className="text-xs text-muted-foreground">Prioridade</Label>
            <Input type="number" value={priority} onChange={e => setPriority(parseInt(e.target.value) || 0)} />
          </div>
          {jsonError && (
            <p className="text-sm text-destructive">{jsonError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveTool.isPending}>
              {saveTool.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {tool ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ToolsManager({ agentId }: { agentId: string }) {
  const { data: tools, isLoading } = useAIAgentTools(agentId);
  const saveTool = useSaveAIAgentTool();
  const deleteTool = useDeleteAIAgentTool();
  const [editingTool, setEditingTool] = useState<AIAgentTool | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const installDefaultTools = () => {
    for (const tool of DEFAULT_TOOLS) {
      saveTool.mutate({ ...tool, agent_id: agentId });
    }
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Ferramentas do Agente
              </CardTitle>
              <CardDescription>
                Ações que o agente pode realizar automaticamente durante as conversas.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {(!tools || tools.length === 0) && (
                <Button onClick={installDefaultTools} disabled={saveTool.isPending} variant="outline">
                  {saveTool.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  Instalar Padrão
                </Button>
              )}
              <Button size="sm" onClick={() => { setEditingTool(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Ferramenta
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tools && tools.length > 0 ? (
            <div className="space-y-2">
              {tools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch
                      checked={tool.is_active}
                      onCheckedChange={(checked) =>
                        saveTool.mutate({ ...tool, is_active: checked })
                      }
                    />
                    <button
                      className="text-left flex-1 min-w-0"
                      onClick={() => { setEditingTool(tool); setModalOpen(true); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{tool.name}</span>
                        <Badge variant="outline" className="text-[10px]">{tool.action_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{tool.description}</p>
                    </button>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditingTool(tool); setModalOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteTool.mutate({ id: tool.id, agentId })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma ferramenta configurada.</p>
              <p className="text-sm">Clique em "Instalar Padrão" ou crie uma nova.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ToolEditModal
        tool={editingTool}
        agentId={agentId}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTool(null); }}
      />
    </>
  );
}

function CadenceEditor({
  cadenceSteps,
  onChange,
  stages,
}: {
  cadenceSteps: Record<string, CadenceStep[]>;
  onChange: (steps: Record<string, CadenceStep[]>) => void;
  stages: PipelineStage[];
}) {
  const [selectedStage, setSelectedStage] = useState<string>("");

  const addStep = (stageName: string) => {
    const current = cadenceSteps[stageName] || [];
    const newStep: CadenceStep = {
      step_order: current.length,
      action_type: "ai_message",
      content: "",
      delay_minutes: 60,
      only_if_no_reply: true,
    };
    onChange({ ...cadenceSteps, [stageName]: [...current, newStep] });
  };

  const updateStep = (stageName: string, index: number, updates: Partial<CadenceStep>) => {
    const current = [...(cadenceSteps[stageName] || [])];
    current[index] = { ...current[index], ...updates };
    onChange({ ...cadenceSteps, [stageName]: current });
  };

  const removeStep = (stageName: string, index: number) => {
    const current = (cadenceSteps[stageName] || []).filter((_, i) => i !== index);
    onChange({ ...cadenceSteps, [stageName]: current });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cadência (Follow-up Automático)
        </CardTitle>
        <CardDescription>
          Configure mensagens automáticas que o agente envia quando o lead não responde. Cada estágio pode ter sua própria sequência.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um estágio para configurar cadência" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.display_name}
                  {(cadenceSteps[s.name]?.length || 0) > 0 && (
                    <span className="ml-2 text-xs">({cadenceSteps[s.name].length} steps)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedStage && (
            <Button onClick={() => addStep(selectedStage)}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Step
            </Button>
          )}
        </div>

        {selectedStage && (cadenceSteps[selectedStage] || []).length > 0 && (
          <div className="space-y-3">
            {(cadenceSteps[selectedStage] || []).map((step, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Badge>Step {index + 1}</Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeStep(selectedStage, index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={step.action_type}
                      onValueChange={(v) =>
                        updateStep(selectedStage, index, {
                          action_type: v as "ai_message" | "template_message",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai_message">IA gera a mensagem</SelectItem>
                        <SelectItem value="template_message">Mensagem fixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Aguardar (minutos)</Label>
                    <Input
                      type="number"
                      value={step.delay_minutes}
                      onChange={(e) =>
                        updateStep(selectedStage, index, {
                          delay_minutes: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">
                    {step.action_type === "ai_message"
                      ? "Instrução para a IA (o que ela deve falar)"
                      : "Texto da mensagem"}
                  </Label>
                  <Textarea
                    value={step.content}
                    onChange={(e) =>
                      updateStep(selectedStage, index, { content: e.target.value })
                    }
                    placeholder={
                      step.action_type === "ai_message"
                        ? "Ex: Envie uma mensagem amigável perguntando se o lead teve tempo de avaliar..."
                        : "Ex: Olá! Vi que não conseguimos nos falar. Posso te ajudar?"
                    }
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={step.only_if_no_reply}
                      onCheckedChange={(v) =>
                        updateStep(selectedStage, index, { only_if_no_reply: v })
                      }
                    />
                    <Label className="text-xs">Só se não respondeu</Label>
                  </div>

                  <div className="flex-1">
                    <Label className="text-xs">Ao completar, mover para estágio:</Label>
                    <Select
                      value={step.post_action?.target_stage || ""}
                      onValueChange={(v) =>
                        updateStep(selectedStage, index, {
                          post_action: v ? { type: "move_stage", target_stage: v } : undefined,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="(nenhum)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.name} value={s.name}>
                            {s.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedStage && (cadenceSteps[selectedStage] || []).length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhum step configurado para este estágio. Clique em "Adicionar Step" para começar.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function AIAgentSettings() {
  const { data: agents, isLoading: loadingAgents } = useAIAgents();
  const { data: stages } = usePipelineStages();
  const saveAgent = useSaveAIAgent();
  const toggleAgent = useToggleAIAgent();

  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const agent = agents?.[selectedAgentIndex] || null;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-6");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [targetStages, setTargetStages] = useState<string[]>([]);
  const [settings, setSettings] = useState<AIAgentSettings>(DEFAULT_AGENT_SETTINGS);
  const [cadenceSteps, setCadenceSteps] = useState<Record<string, CadenceStep[]>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Load agent data
  useEffect(() => {
    if (agent) {
      setName(agent.name || "");
      setDescription(agent.description || "");
      setSystemPrompt(agent.system_prompt || "");
      setModel(agent.model || "claude-sonnet-4-6");
      setTemperature(agent.temperature || 0.7);
      setMaxTokens(agent.max_tokens || 4096);
      setTargetStages(agent.target_stages || []);
      setSettings({ ...DEFAULT_AGENT_SETTINGS, ...(agent.settings || {}) });
      setCadenceSteps(agent.cadence_steps || {});
    }
  }, [agent?.id, selectedAgentIndex]);

  const handleSave = () => {
    saveAgent.mutate({
      ...(agent ? { id: agent.id } : {}),
      name: name || "Agente de Vendas IA",
      description,
      system_prompt: systemPrompt,
      model,
      temperature,
      max_tokens: maxTokens,
      target_stages: targetStages,
      settings: settings as unknown as AIAgentSettings,
      cadence_steps: cadenceSteps as unknown as Record<string, CadenceStep[]>,
    });
  };

  const updateSetting = <K extends keyof AIAgentSettings>(key: K, value: AIAgentSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loadingAgents) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            Agentes IA de Vendas
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure seus agentes de IA para atender leads automaticamente via WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {agent && (
            <div className="flex items-center gap-2">
              <Switch
                checked={agent.is_active}
                onCheckedChange={(checked) =>
                  toggleAgent.mutate({ id: agent.id, isActive: checked })
                }
              />
              <Badge variant={agent.is_active ? "default" : "secondary"}>
                {agent.is_active ? "Ativo" : "Desativado"}
              </Badge>
            </div>
          )}
          <Button onClick={handleSave} disabled={saveAgent.isPending}>
            {saveAgent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Agent Selector */}
      {agents && agents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {agents.map((a, idx) => (
            <Button
              key={a.id}
              variant={selectedAgentIndex === idx ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAgentIndex(idx)}
              className="gap-1.5"
            >
              <Bot className="h-3.5 w-3.5" />
              {a.name}
              {a.is_active && (
                <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              )}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Reset form for new agent
              setName("");
              setDescription("");
              setSystemPrompt("");
              setModel("claude-sonnet-4-6");
              setTemperature(0.7);
              setMaxTokens(4096);
              setTargetStages([]);
              setSettings(DEFAULT_AGENT_SETTINGS);
              setCadenceSteps({});
              setSelectedAgentIndex(-1);
            }}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Agente
          </Button>
        </div>
      )}

      {/* Dashboard */}
      {agent && <DashboardCard />}

      {/* Main Config Tabs */}
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic" className="flex items-center gap-1">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Personalidade</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comportamento</span>
          </TabsTrigger>
          <TabsTrigger value="stages" className="flex items-center gap-1">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Funil</span>
          </TabsTrigger>
          <TabsTrigger value="cadence" className="flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Cadência</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-1">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Ferramentas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Personalidade */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados do Agente</CardTitle>
              <CardDescription>
                Defina quem é o seu agente de vendas IA.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome do Agente</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Ana - Assistente de Vendas"
                  />
                </div>
                <div>
                  <Label>Descrição curta</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Qualifica leads e agenda reuniões"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo de IA</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recomendado)</SelectItem>
                      <SelectItem value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Mais rápido)</SelectItem>
                      <SelectItem value="claude-opus-4-6">Claude Opus 4.6 (Mais capaz)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Criatividade: {temperature}</Label>
                  <Slider
                    value={[temperature]}
                    onValueChange={([v]) => setTemperature(v)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="mt-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Mais preciso</span>
                    <span>Mais criativo</span>
                  </div>
                </div>
              </div>

              <div>
                <Label>Prompt do Sistema (Personalidade e Instruções)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Descreva como o agente deve se comportar, qual tom usar, quais regras seguir.
                  Quanto mais detalhado, melhor o resultado.
                </p>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={`Exemplo:
Você é a Ana, assistente de vendas da [Sua Empresa].
Seu objetivo é qualificar leads e agendar reuniões.
Seja amigável, profissional e direta.
Sempre tente descobrir: empresa, faturamento, desafios e timeline.
Quando qualificado (fatura mais de 30k/mês), ofereça uma reunião.`}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comportamento */}
        <TabsContent value="behavior" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horário de Funcionamento
              </CardTitle>
              <CardDescription>
                O agente só responde dentro desses horários. Fora deles, as mensagens ficam na fila.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={settings.working_hours_start}
                    onChange={(e) => updateSetting("working_hours_start", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={settings.working_hours_end}
                    onChange={(e) => updateSetting("working_hours_end", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Dias de funcionamento</Label>
                <div className="flex gap-2 mt-2">
                  {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={settings.working_days.includes(i) ? "default" : "outline"}
                      onClick={() => {
                        const days = settings.working_days.includes(i)
                          ? settings.working_days.filter((d) => d !== i)
                          : [...settings.working_days, i].sort();
                        updateSetting("working_days", days);
                      }}
                    >
                      {day}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Respostas
              </CardTitle>
              <CardDescription>
                Como o agente deve responder para parecer mais natural.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tempo de espera antes de responder (segundos)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={settings.response_delay_min_ms / 1000}
                      onChange={(e) => updateSetting("response_delay_min_ms", parseFloat(e.target.value) * 1000)}
                      placeholder="Mínimo"
                    />
                    <Input
                      type="number"
                      value={settings.response_delay_max_ms / 1000}
                      onChange={(e) => updateSetting("response_delay_max_ms", parseFloat(e.target.value) * 1000)}
                      placeholder="Máximo"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    O agente espera esse tempo antes de começar a "digitar"
                  </p>
                </div>
                <div>
                  <Label>Tempo de espera para agrupar mensagens (debounce)</Label>
                  <Input
                    type="number"
                    value={settings.debounce_seconds}
                    onChange={(e) => updateSetting("debounce_seconds", parseInt(e.target.value) || 30)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Espera o lead terminar de digitar antes de responder
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tamanho máximo por mensagem (caracteres)</Label>
                  <Input
                    type="number"
                    value={settings.message_split_max_length}
                    onChange={(e) => updateSetting("message_split_max_length", parseInt(e.target.value) || 300)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mensagens longas são divididas em partes
                  </p>
                </div>
                <div>
                  <Label>Máximo de mensagens por conversa</Label>
                  <Input
                    type="number"
                    value={settings.max_messages_per_conversation}
                    onChange={(e) => updateSetting("max_messages_per_conversation", parseInt(e.target.value) || 50)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Após esse limite, transfere para humano
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={settings.auto_pause_after_human_reply}
                  onCheckedChange={(v) => updateSetting("auto_pause_after_human_reply", v)}
                />
                <Label>Pausar agente quando um humano responder</Label>
              </div>

              <div>
                <Label>Mensagem de erro (quando algo dá errado)</Label>
                <Input
                  value={settings.fallback_message}
                  onChange={(e) => updateSetting("fallback_message", e.target.value)}
                />
              </div>
              <div>
                <Label>Mensagem para pedir e-mail (ao agendar reunião)</Label>
                <Input
                  value={settings.ask_email_message}
                  onChange={(e) => updateSetting("ask_email_message", e.target.value)}
                  placeholder="Preciso do seu e-mail para enviar o convite da reunião. Pode me informar?"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <Settings2 className="h-4 w-4 mr-2" />
                Configurações Avançadas
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Velocidade de digitação (chars/min)</Label>
                      <Input
                        type="number"
                        value={settings.typing_speed_cpm}
                        onChange={(e) => updateSetting("typing_speed_cpm", parseInt(e.target.value) || 300)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Msgs/hora (rate limit)</Label>
                      <Input
                        type="number"
                        value={settings.cadence_max_messages_per_hour}
                        onChange={(e) => updateSetting("cadence_max_messages_per_hour", parseInt(e.target.value) || 50)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Msgs/dia (rate limit)</Label>
                      <Input
                        type="number"
                        value={settings.cadence_max_messages_per_day}
                        onChange={(e) => updateSetting("cadence_max_messages_per_day", parseInt(e.target.value) || 60)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">Lock (segundos)</Label>
                      <Input
                        type="number"
                        value={settings.lock_duration_seconds}
                        onChange={(e) => updateSetting("lock_duration_seconds", parseInt(e.target.value) || 30)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Tentativas máximas</Label>
                      <Input
                        type="number"
                        value={settings.max_retry_attempts}
                        onChange={(e) => updateSetting("max_retry_attempts", parseInt(e.target.value) || 3)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Batch size</Label>
                      <Input
                        type="number"
                        value={settings.queue_batch_size}
                        onChange={(e) => updateSetting("queue_batch_size", parseInt(e.target.value) || 5)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Duração da reunião (minutos)</Label>
                      <Input
                        type="number"
                        value={settings.meeting_duration_minutes}
                        onChange={(e) => updateSetting("meeting_duration_minutes", parseInt(e.target.value) || 45)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Histórico de contexto (mensagens)</Label>
                      <Input
                        type="number"
                        value={settings.context_messages_limit}
                        onChange={(e) => updateSetting("context_messages_limit", parseInt(e.target.value) || 250)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>

        {/* Tab: Funil */}
        <TabsContent value="stages" className="space-y-4 mt-4">
          <PipelineStagesManager />

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Estágios Ativos para o Agente</CardTitle>
              <CardDescription>
                Selecione em quais estágios o agente deve atuar. Nos demais, ele fica inativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(stages || []).map((stage) => (
                  <Button
                    key={stage.name}
                    size="sm"
                    variant={targetStages.includes(stage.name) ? "default" : "outline"}
                    onClick={() => {
                      setTargetStages((prev) =>
                        prev.includes(stage.name)
                          ? prev.filter((s) => s !== stage.name)
                          : [...prev, stage.name]
                      );
                    }}
                  >
                    {stage.display_name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reativação Automática</CardTitle>
              <CardDescription>
                Quando um lead em estágio "terminal" (perdido, etc) envia mensagem, mover automaticamente para outro estágio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stages || [])
                .filter((s) => s.is_terminal)
                .map((stage) => (
                  <div key={stage.name} className="flex items-center gap-3">
                    <Badge variant="destructive">{stage.display_name}</Badge>
                    <span className="text-sm">→</span>
                    <Select
                      value={settings.cadence_reactivation_map[stage.name] || "__none__"}
                      onValueChange={(v) => {
                        const map = { ...settings.cadence_reactivation_map };
                        if (v && v !== "__none__") {
                          map[stage.name] = v;
                        } else {
                          delete map[stage.name];
                        }
                        updateSetting("cadence_reactivation_map", map);
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="(nenhum)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {(stages || [])
                          .filter((s) => !s.is_terminal)
                          .map((s) => (
                            <SelectItem key={s.name} value={s.name}>
                              {s.display_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              {(stages || []).filter((s) => s.is_terminal).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum estágio terminal configurado. Marque estágios como "terminal" na seção acima.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cadência */}
        <TabsContent value="cadence" className="mt-4">
          <CadenceEditor
            cadenceSteps={cadenceSteps}
            onChange={setCadenceSteps}
            stages={stages || []}
          />
        </TabsContent>

        {/* Tab: Ferramentas */}
        <TabsContent value="tools" className="mt-4">
          {agent ? (
            <ToolsManager agentId={agent.id} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Salve o agente primeiro para configurar ferramentas.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
