import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

export interface AIAgentSettings {
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  debounce_seconds: number;
  response_delay_min_ms: number;
  response_delay_max_ms: number;
  typing_speed_cpm: number;
  message_split_max_length: number;
  delay_between_messages_min_ms: number;
  delay_between_messages_max_ms: number;
  context_messages_limit: number;
  max_messages_per_conversation: number;
  auto_pause_after_human_reply: boolean;
  lock_duration_seconds: number;
  max_retry_attempts: number;
  queue_batch_size: number;
  meeting_duration_minutes: number;
  cadence_silence_timeout_minutes: number;
  cadence_reactivation_map: Record<string, string>;
  cadence_max_messages_per_hour: number;
  cadence_max_messages_per_day: number;
  fallback_message: string;
  ask_email_message: string;
}

export interface CadenceStep {
  step_order: number;
  action_type: "ai_message" | "template_message";
  content: string;
  caption?: string;
  delay_minutes: number;
  only_if_no_reply: boolean;
  post_action?: { type: string; target_stage: string };
}

export interface AISalesAgent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  personality_traits: string[];
  target_stages: string[];
  settings: AIAgentSettings;
  cadence_steps: Record<string, CadenceStep[]>;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIAgentTool {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIAgentConversation {
  id: string;
  lead_id: string;
  agent_id: string;
  status: string;
  messages_history: unknown[];
  total_messages_sent: number;
  total_messages_received: number;
  paused_by: string | null;
  paused_at: string | null;
  pause_reason: string | null;
  last_processed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AIAgentLog {
  id: string;
  conversation_id: string;
  lead_id: string;
  agent_id: string;
  log_type: string;
  data: Record<string, unknown>;
  tokens_input: number | null;
  tokens_output: number | null;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  is_terminal: boolean;
}

export interface AIAgentDashboard {
  agent_id: string;
  agent_name: string;
  is_active: boolean;
  total_conversations: number;
  active_conversations: number;
  paused_conversations: number;
  total_messages_sent: number;
  pending_in_queue: number;
  failed_in_queue: number;
}

// ============================================
// Default Settings
// ============================================

export const DEFAULT_AGENT_SETTINGS: AIAgentSettings = {
  working_hours_start: "08:00",
  working_hours_end: "23:00",
  working_days: [0, 1, 2, 3, 4, 5, 6],
  debounce_seconds: 30,
  response_delay_min_ms: 2000,
  response_delay_max_ms: 5000,
  typing_speed_cpm: 300,
  message_split_max_length: 300,
  delay_between_messages_min_ms: 500,
  delay_between_messages_max_ms: 1500,
  context_messages_limit: 250,
  max_messages_per_conversation: 50,
  auto_pause_after_human_reply: true,
  lock_duration_seconds: 30,
  max_retry_attempts: 3,
  queue_batch_size: 5,
  meeting_duration_minutes: 45,
  cadence_silence_timeout_minutes: 720,
  cadence_reactivation_map: {},
  cadence_max_messages_per_hour: 50,
  cadence_max_messages_per_day: 60,
  fallback_message: "Desculpe, tive um problema técnico. Um atendente vai te ajudar em breve!",
  ask_email_message: "Preciso do seu e-mail para enviar o convite da reunião. Pode me informar?",
};

// ============================================
// Pipeline Stages Hook
// ============================================

export function usePipelineStages() {
  return useQuery({
    queryKey: ["pipeline-stages"],
    queryFn: async (): Promise<PipelineStage[]> => {
      const { data, error } = await supabase
        .from("sales_pipeline_stages")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data || []) as unknown as PipelineStage[];
    },
  });
}

export function useSavePipelineStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stage: Partial<PipelineStage> & { name: string; display_name: string }) => {
      if (stage.id) {
        const { error } = await supabase
          .from("sales_pipeline_stages")
          .update(stage as Record<string, unknown>)
          .eq("id", stage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sales_pipeline_stages")
          .insert(stage as Record<string, unknown>);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Estágio salvo!");
    },
    onError: (e) => toast.error("Erro ao salvar estágio: " + e.message),
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-stages"] });
      toast.success("Estágio removido!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============================================
// Agent Hooks
// ============================================

export function useAIAgents() {
  return useQuery({
    queryKey: ["ai-agents"],
    queryFn: async (): Promise<AISalesAgent[]> => {
      const { data, error } = await supabase
        .from("ai_sales_agents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as AISalesAgent[];
    },
  });
}

export function useAIAgent(id: string | undefined) {
  return useQuery({
    queryKey: ["ai-agent", id],
    queryFn: async (): Promise<AISalesAgent | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("ai_sales_agents")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as AISalesAgent;
    },
    enabled: !!id,
  });
}

export function useAIAgentTools(agentId: string | undefined) {
  return useQuery({
    queryKey: ["ai-agent-tools", agentId],
    queryFn: async (): Promise<AIAgentTool[]> => {
      if (!agentId) return [];
      const { data, error } = await supabase
        .from("ai_agent_tools")
        .select("*")
        .eq("agent_id", agentId)
        .order("priority");
      if (error) throw error;
      return (data || []) as unknown as AIAgentTool[];
    },
    enabled: !!agentId,
  });
}

export function useSaveAIAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agent: Partial<AISalesAgent>) => {
      if (agent.id) {
        const { id, created_at, updated_at, ...updates } = agent;
        const { data, error } = await supabase
          .from("ai_sales_agents")
          .update(updates as Record<string, unknown>)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("ai_sales_agents")
          .insert(agent as Record<string, unknown>)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      queryClient.invalidateQueries({ queryKey: ["ai-agent"] });
      toast.success("Agente salvo!");
    },
    onError: (e) => toast.error("Erro ao salvar agente: " + e.message),
  });
}

export function useSaveAIAgentTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tool: Partial<AIAgentTool>) => {
      if (tool.id) {
        const { id, created_at, updated_at, ...updates } = tool;
        const { error } = await supabase
          .from("ai_agent_tools")
          .update(updates as Record<string, unknown>)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_agent_tools")
          .insert(tool as Record<string, unknown>);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-tools", vars.agent_id] });
      toast.success("Ferramenta salva!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteAIAgentTool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase.from("ai_agent_tools").delete().eq("id", id);
      if (error) throw error;
      return agentId;
    },
    onSuccess: (agentId) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-tools", agentId] });
      toast.success("Ferramenta removida!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useToggleAIAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("ai_sales_agents")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agents"] });
      toast.success("Agente atualizado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============================================
// Lead-specific hooks
// ============================================

export function useAIAgentStatusForLead(leadId: string | undefined) {
  return useQuery({
    queryKey: ["ai-agent-status", leadId],
    queryFn: async () => {
      if (!leadId) return null;
      const { data, error } = await supabase.rpc("get_ai_agent_status_for_lead", {
        p_lead_id: leadId,
      });
      if (error) throw error;
      return data?.[0] || { has_agent: false };
    },
    enabled: !!leadId,
    refetchInterval: 10000,
  });
}

export function useAIAgentConversation(leadId: string | undefined) {
  return useQuery({
    queryKey: ["ai-agent-conversation", leadId],
    queryFn: async (): Promise<AIAgentConversation | null> => {
      if (!leadId) return null;
      const { data, error } = await supabase
        .from("ai_agent_conversations")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AIAgentConversation;
    },
    enabled: !!leadId,
  });
}

export function useAIAgentLogs(conversationId: string | undefined, limit = 50) {
  return useQuery({
    queryKey: ["ai-agent-logs", conversationId, limit],
    queryFn: async (): Promise<AIAgentLog[]> => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("ai_agent_logs")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as AIAgentLog[];
    },
    enabled: !!conversationId,
  });
}

export function useToggleAIAgentConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadId,
      action,
      reason,
      agentId,
    }: {
      leadId: string;
      action: "pause" | "resume" | "activate";
      reason?: string;
      agentId?: string;
    }) => {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("ai-sales-agent", {
        body: {
          action: "toggle_conversation",
          lead_id: leadId,
          toggle_action: action,
          user_id: session?.session?.user?.id,
          reason,
          agent_id: agentId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-status", vars.leadId] });
      queryClient.invalidateQueries({ queryKey: ["ai-agent-conversation", vars.leadId] });
      const msg =
        vars.action === "pause"
          ? "Agente pausado"
          : vars.action === "resume"
            ? "Agente retomado"
            : "Agente ativado";
      toast.success(msg);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useAIAgentDashboard() {
  return useQuery({
    queryKey: ["ai-agent-dashboard"],
    queryFn: async (): Promise<AIAgentDashboard[]> => {
      const { data, error } = await supabase
        .from("v_ai_agent_dashboard")
        .select("*");
      if (error) throw error;
      return (data || []) as unknown as AIAgentDashboard[];
    },
  });
}

export function useTestAIAgent() {
  return useMutation({
    mutationFn: async ({
      leadId,
      message,
    }: {
      leadId: string;
      message?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-sales-agent", {
        body: {
          action: "process_direct",
          lead_id: leadId,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Mensagem processada!"),
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useCadenceEnrollments(agentId: string | undefined) {
  return useQuery({
    queryKey: ["cadence-enrollments", agentId],
    queryFn: async () => {
      if (!agentId) return [];
      const { data, error } = await supabase
        .from("ai_agent_cadence_enrollments")
        .select("*, leads(name, phone, status)")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!agentId,
  });
}

export function useCancelCadenceEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ai_agent_cadence_enrollments")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cadence-enrollments"] });
      toast.success("Cadência cancelada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
