import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeUazapiUrl } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Types
// ============================================

interface AgentConfig {
  id: string;
  name: string;
  system_prompt: string;
  personality_traits: string[];
  target_stages: string[];
  settings: AgentSettings;
  model: string;
  temperature: number;
  max_tokens: number;
  cadence_steps: Record<string, CadenceStep[]>;
}

interface AgentSettings {
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

interface CadenceStep {
  step_order: number;
  action_type: "ai_message" | "template_message";
  content: string;
  caption?: string;
  delay_minutes: number;
  only_if_no_reply: boolean;
  post_action?: { type: string; target_stage: string };
}

interface ToolDef {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
}

interface QueueMessage {
  id: string;
  lead_id: string;
  message_id: string;
  conversation_id: string;
  message_content: string;
}

// ============================================
// Helpers
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWithinWorkingHours(settings: AgentSettings): boolean {
  const now = new Date();
  // Use São Paulo timezone
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const currentTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
  });
  const dayOfWeek = now.getDay();

  if (!settings.working_days.includes(dayOfWeek)) return false;
  if (currentTime < settings.working_hours_start) return false;
  if (currentTime > settings.working_hours_end) return false;
  return true;
}

function formatToolLabel(toolName: string, input: Record<string, unknown>, resultStr: string): string {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(resultStr); } catch { /* ignore */ }
  const success = parsed.success !== false;
  const icon = success ? "✅" : "❌";

  switch (toolName) {
    case "schedule_meeting":
      return `${icon} Agente IA agendou reunião: ${input.title || "Reunião"} em ${input.date} às ${input.time}`;
    case "reschedule_meeting":
      return `${icon} Agente IA reagendou reunião para ${input.new_date} às ${input.new_time}`;
    case "cancel_meeting":
      return `${icon} Agente IA cancelou reunião. Motivo: ${input.reason || "não informado"}`;
    case "check_availability":
      return `🔍 Agente IA verificou disponibilidade para ${input.date}${input.period ? ` (${input.period})` : ""}`;
    case "qualify_bant":
      return `📋 Agente IA qualificou lead — Necessidade: ${input.need || "?"}, Interesse: ${input.interest_level || "?"}, Orçamento: ${input.budget || "?"}`;
    case "update_lead":
      return `📝 Agente IA atualizou dados do lead: ${Object.entries(input).map(([k, v]) => `${k}=${v}`).join(", ")}`;
    case "change_stage": {
      const stageLabels: Record<string, string> = {
        new: "Novo", first_contact: "Primeiro Contato", qualifying: "Qualificando",
        negotiating: "Negociando", proposal_sent: "Proposta Enviada",
        won: "Ganho", lost: "Perdido",
      };
      return `🔄 Agente IA moveu lead para: ${stageLabels[String(input.stage)] || input.stage}`;
    }
    case "transfer_to_human":
      return `🚨 Agente IA transferiu para atendente humano. Motivo: ${input.reason || "não informado"}`;
    case "schedule_followup":
      return `⏰ Agente IA agendou follow-up em ${input.minutes || input.delay_minutes || "?"} minutos`;
    case "send_template":
      return `📄 Agente IA enviou template: ${input.template_name || "?"}`;
    default:
      return `🤖 Agente IA executou: ${toolName}(${Object.entries(input).map(([k, v]) => `${k}=${v}`).join(", ")})`;
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  // Split by paragraphs first - each paragraph becomes its own message
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  // Also split on single \n if it looks like intentional line breaks
  const parts: string[] = [];
  for (const para of paragraphs) {
    // If paragraph has single line breaks, treat each line as separate message
    const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      parts.push(...lines);
    } else {
      parts.push(para);
    }
  }

  // If any part is still too long, split by sentences
  const result: string[] = [];
  for (const part of parts) {
    if (part.length <= maxLength) {
      result.push(part);
    } else {
      const sentences = part.split(/(?<=[.!?])\s+/);
      let chunk = "";
      for (const sentence of sentences) {
        if (chunk && (chunk + " " + sentence).length > maxLength) {
          result.push(chunk.trim());
          chunk = sentence;
        } else {
          chunk = chunk ? chunk + " " + sentence : sentence;
        }
      }
      if (chunk.trim()) result.push(chunk.trim());
    }
  }

  return result.length > 0 ? result : [text];
}

function parseFlexibleNumber(value: string): number {
  if (!value) return 0;
  const clean = value.toLowerCase()
    .replace(/[r$\s.]/g, "")
    .replace(",", ".")
    .replace("mil", "000")
    .replace("k", "000")
    .replace("m", "000000");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

// ============================================
// UAZAPI Communication
// ============================================

async function getInstanceConfig(
  supabase: SupabaseClient,
  leadId: string
): Promise<{ baseUrl: string; token: string; phone: string; instanceId: string } | null> {
  // Get lead's phone
  const { data: lead } = await supabase
    .from("leads")
    .select("phone, assigned_to")
    .eq("id", leadId)
    .single();

  if (!lead?.phone) return null;

  // Get the WhatsApp instance (from the assigned seller, or first available)
  let instanceQuery = supabase.from("whatsapp_instances").select("*").eq("status", "connected");

  if (lead.assigned_to) {
    // Try to get the seller's instance first
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", lead.assigned_to)
      .single();

    if (profile) {
      const { data: sellerInstance } = await instanceQuery
        .eq("owner_id", profile.id)
        .single();

      if (sellerInstance) {
        const subdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
        const baseUrl = sellerInstance.uazapi_url || normalizeUazapiUrl(subdomain);
        return {
          baseUrl,
          token: sellerInstance.token,
          phone: lead.phone.replace(/\D/g, ""),
          instanceId: sellerInstance.id,
        };
      }
    }
  }

  // Fallback: first connected instance
  const { data: anyInstance } = await supabase
    .from("whatsapp_instances")
    .select("*")
    .eq("status", "connected")
    .limit(1)
    .single();

  if (!anyInstance) return null;

  const subdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
  const baseUrl = anyInstance.uazapi_url || normalizeUazapiUrl(subdomain);
  return {
    baseUrl,
    token: anyInstance.token,
    phone: lead.phone.replace(/\D/g, ""),
    instanceId: anyInstance.id,
  };
}

async function sendTypingIndicator(
  phone: string,
  config: { baseUrl: string; token: string }
): Promise<void> {
  try {
    await fetch(`${config.baseUrl}/send/composing`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: config.token },
      body: JSON.stringify({ number: phone, duration: 3000 }),
    });
  } catch (e) {
    console.warn("Typing indicator failed:", e);
  }
}

async function sendWhatsAppMessage(
  phone: string,
  text: string,
  config: { baseUrl: string; token: string },
  supabase: SupabaseClient,
  leadId: string,
  instanceId: string
): Promise<string | null> {
  const res = await fetch(`${config.baseUrl}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token: config.token },
    body: JSON.stringify({ number: phone, text }),
  });

  const result = await res.json();
  const messageId = result?.key?.id || result?.messageId || null;

  // Save to lead_messages
  await supabase.from("lead_messages").insert({
    lead_id: leadId,
    sender_type: "ai_agent",
    message: text,
    whatsapp_instance_id: instanceId,
    uazapi_message_id: messageId,
    direction: "outgoing",
    message_status: "sent",
  });

  return messageId;
}

async function sendHumanizedResponse(
  phone: string,
  text: string,
  settings: AgentSettings,
  config: { baseUrl: string; token: string },
  supabase: SupabaseClient,
  leadId: string,
  instanceId: string
): Promise<void> {
  // 1. Pre-response delay
  await sleep(randomBetween(settings.response_delay_min_ms, settings.response_delay_max_ms));

  // 2. Split into natural parts
  const parts = splitMessage(text, settings.message_split_max_length);

  for (const part of parts) {
    // 3. Typing indicator
    await sendTypingIndicator(phone, config);

    // 4. Typing simulation delay
    const typingMs = (part.length / settings.typing_speed_cpm) * 60000;
    await sleep(Math.min(typingMs, 8000));

    // 5. Send message
    await sendWhatsAppMessage(phone, part, config, supabase, leadId, instanceId);

    // 6. Delay between parts
    if (parts.length > 1) {
      await sleep(randomBetween(settings.delay_between_messages_min_ms, settings.delay_between_messages_max_ms));
    }
  }
}

// ============================================
// Rate Limiting
// ============================================

async function checkRateLimit(
  supabase: SupabaseClient,
  instanceId: string,
  maxPerHour: number,
  maxPerDay: number
): Promise<boolean> {
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const { data: counts } = await supabase
    .from("ai_agent_send_counts")
    .select("window_type, message_count")
    .eq("instance_id", instanceId)
    .or(
      `and(window_type.eq.hour,window_start.eq.${hourStart.toISOString()}),and(window_type.eq.day,window_start.eq.${dayStart.toISOString()})`
    );

  const hourCount = counts?.find((c) => c.window_type === "hour")?.message_count || 0;
  const dayCount = counts?.find((c) => c.window_type === "day")?.message_count || 0;

  return hourCount < maxPerHour && dayCount < maxPerDay;
}

async function incrementSendCount(
  supabase: SupabaseClient,
  instanceId: string
): Promise<void> {
  const now = new Date();
  const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const [windowType, windowStart] of [["hour", hourStart], ["day", dayStart]] as const) {
    try {
      const { data: existing } = await supabase
        .from("ai_agent_send_counts")
        .select("id, message_count")
        .eq("instance_id", instanceId)
        .eq("window_start", (windowStart as Date).toISOString())
        .eq("window_type", windowType)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("ai_agent_send_counts")
          .update({ message_count: existing.message_count + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("ai_agent_send_counts").insert({
          instance_id: instanceId,
          window_start: (windowStart as Date).toISOString(),
          window_type: windowType,
          message_count: 1,
        });
      }
    } catch (e) {
      console.warn("incrementSendCount error:", e);
    }
  }
}

// ============================================
// Context Gathering
// ============================================

async function gatherContext(
  supabase: SupabaseClient,
  leadId: string,
  settings: AgentSettings
): Promise<string> {
  const parts: string[] = [];

  // Lead data
  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (lead) {
    parts.push(`## Dados do Lead
- Nome: ${lead.name || "Não informado"}
- Telefone: ${lead.phone}
- Email: ${lead.email || "Não informado"}
- Status atual: ${lead.status}
- Instagram: ${lead.instagram_username || "Não informado"}
- Valor do deal: ${lead.deal_value || "Não definido"}
- Score: ${lead.sales_score || "Não calculado"}
- BANT Budget: ${lead.bant_budget || "unknown"}
- BANT Authority: ${lead.bant_authority || "unknown"}
- BANT Need: ${lead.bant_need || "unknown"}
- BANT Timeline: ${lead.bant_timeline || "unknown"}
- Notas: ${lead.notes || "Nenhuma"}
- Criado em: ${lead.created_at}`);
  }

  // Message history
  const { data: messages } = await supabase
    .from("lead_messages")
    .select("sender_type, message, direction, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(settings.context_messages_limit || 50);

  if (messages && messages.length > 0) {
    const history = messages.reverse().map((m) => {
      const sender = m.direction === "incoming" ? "Lead" : "Agente";
      return `[${new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}] ${sender}: ${m.message}`;
    }).join("\n");
    parts.push(`## Histórico de Mensagens (últimas ${messages.length})\n${history}`);
  }

  // Tasks/Meetings
  const { data: tasks } = await supabase
    .from("lead_tasks")
    .select("type, title, status, scheduled_at, description")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (tasks && tasks.length > 0) {
    const taskList = tasks.map((t) =>
      `- [${t.status}] ${t.type}: ${t.title}${t.scheduled_at ? ` (agendado: ${new Date(t.scheduled_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })})` : ""}`
    ).join("\n");
    parts.push(`## Tarefas/Reuniões\n${taskList}`);
  }

  // Meetings
  const { data: meetings } = await supabase
    .from("lead_meetings")
    .select("status, started_at, ai_summary")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (meetings && meetings.length > 0) {
    const meetingList = meetings.map((m) =>
      `- [${m.status}] ${m.started_at ? new Date(m.started_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "sem data"}${m.ai_summary ? ` - ${m.ai_summary.substring(0, 100)}` : ""}`
    ).join("\n");
    parts.push(`## Reuniões\n${meetingList}`);
  }

  // Pipeline stages (for context)
  const { data: stages } = await supabase
    .from("sales_pipeline_stages")
    .select("name, display_name, sort_order")
    .eq("is_active", true)
    .order("sort_order");

  if (stages && stages.length > 0) {
    const stageList = stages.map((s) => `${s.name}: ${s.display_name}`).join(", ");
    parts.push(`## Estágios do Pipeline Disponíveis\n${stageList}`);
  }

  return parts.join("\n\n");
}

// ============================================
// Tool Execution
// ============================================

async function executeTool(
  supabase: SupabaseClient,
  tool: ToolDef,
  args: Record<string, unknown>,
  leadId: string,
  agentId: string,
  conversationId: string,
  agentSettings?: AgentSettings
): Promise<string> {
  console.log(`Executing tool: ${tool.name}`, args);

  switch (tool.action_type) {
    case "qualify_bant": {
      const updates: Record<string, unknown> = {};
      if (args.budget) updates.bant_budget = "confirmed";
      if (args.authority) updates.bant_authority = "confirmed";
      if (args.need) updates.bant_need = "confirmed";
      if (args.timeline) updates.bant_timeline = "confirmed";

      // Store qualification data in notes
      const qualData = Object.entries(args)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const { data: currentLead } = await supabase
        .from("leads")
        .select("notes")
        .eq("id", leadId)
        .single();

      const existingNotes = currentLead?.notes || "";
      updates.notes = existingNotes
        ? `${existingNotes}\n\n[AI Qualificação] ${qualData}`
        : `[AI Qualificação] ${qualData}`;

      await supabase.from("leads").update(updates).eq("id", leadId);

      // Calculate score
      let score = 0;
      if (args.company_name) score += 15;
      if (args.employee_count) score += 10;
      if (args.monthly_revenue) {
        const rev = parseFlexibleNumber(String(args.monthly_revenue));
        score += rev >= 30000 ? 25 : rev >= 10000 ? 15 : 5;
      }
      if (args.budget) score += 15;
      if (args.authority) score += 10;
      if (args.need) score += 15;
      if (args.timeline) score += 10;

      await supabase.from("leads").update({
        sales_score: Math.min(score, 100),
        score_calculated_at: new Date().toISOString(),
      }).eq("id", leadId);

      return JSON.stringify({ success: true, score, qualification: qualData });
    }

    case "update_lead": {
      const updates: Record<string, unknown> = {};
      if (args.name) updates.name = args.name;
      if (args.email) updates.email = args.email;
      if (args.instagram_username) updates.instagram_username = args.instagram_username;

      if (Object.keys(updates).length > 0) {
        await supabase.from("leads").update(updates).eq("id", leadId);
      }
      return JSON.stringify({ success: true, updated: Object.keys(updates) });
    }

    case "check_availability": {
      const dateStr = String(args.date || "");
      const targetDate = new Date(dateStr + "T12:00:00");
      const dayOfWeek = targetDate.getDay(); // 0=sunday

      // Get the assigned seller's profile_id
      const { data: leadData } = await supabase
        .from("leads")
        .select("assigned_to")
        .eq("id", leadId)
        .single();

      let sellerProfileId: string | null = null;
      if (leadData?.assigned_to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", leadData.assigned_to)
          .single();
        sellerProfileId = profile?.id || null;
      }

      // Check user_availability for the seller on this day of week
      let workStart = 9;
      let workEnd = 18;
      let isAvailable = dayOfWeek >= 1 && dayOfWeek <= 5; // default Mon-Fri

      if (sellerProfileId) {
        const { data: avail } = await supabase
          .from("user_availability")
          .select("*")
          .eq("profile_id", sellerProfileId)
          .eq("day_of_week", dayOfWeek)
          .single();

        if (avail) {
          isAvailable = avail.is_available;
          if (isAvailable) {
            const [sh] = avail.start_time.split(":").map(Number);
            const [eh] = avail.end_time.split(":").map(Number);
            workStart = sh;
            workEnd = eh;
          }
        }
      }

      if (!isAvailable) {
        return JSON.stringify({
          date: dateStr,
          available_slots: [],
          busy_slots: [],
          note: "Vendedor indisponível neste dia da semana.",
        });
      }

      // Get existing tasks for this seller on this date
      let taskQuery = supabase
        .from("lead_tasks")
        .select("title, scheduled_at, duration_minutes")
        .gte("scheduled_at", dateStr + "T00:00:00")
        .lte("scheduled_at", dateStr + "T23:59:59")
        .in("status", ["pending", "in_progress"]);

      if (sellerProfileId) {
        taskQuery = taskQuery.or(`assigned_to.eq.${sellerProfileId},profile_id.eq.${sellerProfileId}`);
      }

      const { data: tasks } = await taskQuery;

      // Build busy intervals
      const busyIntervals = (tasks || []).map((t) => {
        const start = new Date(t.scheduled_at);
        const dur = t.duration_minutes || 60;
        const end = new Date(start.getTime() + dur * 60 * 1000);
        return { start, end, title: t.title };
      });

      const busySlots = busyIntervals.map((b) => ({
        time: `${b.start.getHours()}:${String(b.start.getMinutes()).padStart(2, "0")}`,
        title: b.title,
      }));

      // Generate free 30-min slots within working hours
      const available: string[] = [];
      for (let h = workStart; h < workEnd; h++) {
        for (const m of [0, 30]) {
          const slotStart = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-03:00`);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

          const hasConflict = busyIntervals.some(
            (b) => slotStart < b.end && slotEnd > b.start
          );

          if (!hasConflict) {
            available.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          }
        }
      }

      return JSON.stringify({
        date: dateStr,
        working_hours: `${String(workStart).padStart(2, "0")}:00-${String(workEnd).padStart(2, "0")}:00`,
        available_slots: available,
        busy_slots: busySlots,
      });
    }

    case "schedule_meeting": {
      const date = String(args.date || "");
      const time = String(args.time || "10:00");
      const emailArg = String(args.email || "");
      const scheduledAt = `${date}T${time}:00-03:00`;

      // Get lead data including email
      const { data: leadData } = await supabase
        .from("leads")
        .select("assigned_to, email")
        .eq("id", leadId)
        .single();

      // Check if we have an email (from args or from lead)
      const email = emailArg || leadData?.email || "";

      if (!email) {
        const askMsg = agentSettings?.ask_email_message || "Preciso do seu e-mail para enviar o convite da reunião. Pode me informar?";
        return JSON.stringify({
          success: false,
          needs_email: true,
          message: askMsg,
        });
      }

      // Save email on lead if it didn't have one
      if (!leadData?.email && email) {
        await supabase.from("leads").update({ email }).eq("id", leadId);
      }

      // Get agent's settings for meeting duration
      const { data: agent } = await supabase
        .from("ai_sales_agents")
        .select("settings")
        .eq("id", agentId)
        .single();

      const duration = agent?.settings?.meeting_duration_minutes || 45;

      let profileId: string | null = null;
      if (leadData?.assigned_to) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", leadData.assigned_to)
          .single();
        profileId = profile?.id || null;
      }
      if (!profileId) {
        // Fallback: first profile
        const { data: anyProfile } = await supabase
          .from("profiles")
          .select("id")
          .limit(1)
          .single();
        profileId = anyProfile?.id || null;
      }

      if (!profileId) {
        return JSON.stringify({ error: "No profile found to assign meeting" });
      }

      await supabase.from("lead_tasks").insert({
        lead_id: leadId,
        profile_id: profileId,
        type: "meeting",
        title: `Reunião agendada pela IA`,
        description: `Reunião agendada automaticamente pelo agente IA. Email: ${email}`,
        status: "pending",
        priority: "high",
        scheduled_at: scheduledAt,
        duration_minutes: duration,
      });

      // Update lead status
      await supabase.from("leads").update({ status: "negotiating" }).eq("id", leadId);

      return JSON.stringify({
        success: true,
        meeting: { date, time, duration_minutes: duration, email },
      });
    }

    case "reschedule_meeting": {
      const newDate = String(args.new_date || "");
      const newTime = String(args.new_time || "10:00");
      const action = String(args.action || "reschedule");

      if (action === "cancel") {
        await supabase
          .from("lead_tasks")
          .update({ status: "completed" })
          .eq("lead_id", leadId)
          .eq("type", "meeting")
          .eq("status", "pending");

        return JSON.stringify({ success: true, action: "cancelled" });
      }

      const scheduledAt = `${newDate}T${newTime}:00-03:00`;
      await supabase
        .from("lead_tasks")
        .update({ scheduled_at: scheduledAt })
        .eq("lead_id", leadId)
        .eq("type", "meeting")
        .eq("status", "pending");

      return JSON.stringify({ success: true, action: "rescheduled", new_date: newDate, new_time: newTime });
    }

    case "confirm_meeting": {
      await supabase
        .from("lead_tasks")
        .update({ status: "in_progress" })
        .eq("lead_id", leadId)
        .eq("type", "meeting")
        .eq("status", "pending");

      return JSON.stringify({ success: true, status: "confirmed" });
    }

    case "change_stage": {
      const newStage = String(args.stage || args.new_stage || "");
      if (newStage) {
        await supabase.from("leads").update({ status: newStage }).eq("id", leadId);
      }
      return JSON.stringify({ success: true, new_stage: newStage });
    }

    case "notify_human": {
      const reason = String(args.reason || "Transferência solicitada pelo agente IA");
      const urgency = String(args.urgency || "normal");

      // Pause conversation
      await supabase
        .from("ai_agent_conversations")
        .update({
          status: "transferred",
          pause_reason: reason,
          paused_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      // Log transfer
      await supabase.from("ai_agent_logs").insert({
        conversation_id: conversationId,
        lead_id: leadId,
        agent_id: agentId,
        log_type: "transfer",
        data: { reason, urgency },
      });

      return JSON.stringify({ success: true, transferred: true, reason });
    }

    case "mark_lost": {
      const reason = String(args.reason || "Marcado como perdido pelo agente IA");
      await supabase.from("leads").update({
        status: "lost",
        loss_reason: reason,
        closed_at: new Date().toISOString(),
      }).eq("id", leadId);

      // Complete conversation
      await supabase
        .from("ai_agent_conversations")
        .update({ status: "completed" })
        .eq("id", conversationId);

      return JSON.stringify({ success: true, status: "lost", reason });
    }

    case "schedule_followup": {
      const minutes = parseInt(String(args.minutes || args.delay_minutes || "60"));
      const note = String(args.message_hint || args.context_note || args.note || "Follow-up agendado pela IA");
      const scheduledAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

      await supabase.from("ai_agent_scheduled_followups").insert({
        lead_id: leadId,
        conversation_id: conversationId,
        agent_id: agentId,
        scheduled_at: scheduledAt,
        context_note: note,
      });

      return JSON.stringify({ success: true, scheduled_at: scheduledAt, note });
    }

    default:
      return JSON.stringify({ error: `Unknown action_type: ${tool.action_type}` });
  }
}

// ============================================
// Claude API Call
// ============================================

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: unknown }>,
  tools: ToolDef[],
  temperature: number,
  maxTokens: number,
  retryCount = 0
): Promise<{
  content: string;
  toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }>;
  tokensInput: number;
  tokensOutput: number;
  stopReason: string;
}> {
  const anthropicTools = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages,
  };

  if (anthropicTools.length > 0) {
    body.tools = anthropicTools;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (res.status === 429 && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.warn(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        return callClaude(apiKey, model, systemPrompt, messages, tools, temperature, maxTokens, retryCount + 1);
      }
      throw new Error(`Anthropic API error ${res.status}: ${errorText}`);
    }

    const data = await res.json();

    let textContent = "";
    const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

    for (const block of data.content || []) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input || {},
        });
      }
    }

    return {
      content: textContent,
      toolCalls,
      tokensInput: data.usage?.input_tokens || 0,
      tokensOutput: data.usage?.output_tokens || 0,
      stopReason: data.stop_reason || "end_turn",
    };
  } catch (error) {
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000;
      console.warn(`API error, retrying in ${delay}ms:`, error);
      await sleep(delay);
      return callClaude(apiKey, model, systemPrompt, messages, tools, temperature, maxTokens, retryCount + 1);
    }
    throw error;
  }
}

// ============================================
// Core Processing
// ============================================

async function processLeadMessage(
  supabase: SupabaseClient,
  leadId: string,
  agent: AgentConfig,
  apiKey: string,
  conversationId: string
): Promise<void> {
  // 1. Check working hours
  if (!isWithinWorkingHours(agent.settings)) {
    console.log("Outside working hours, skipping");
    await supabase.from("ai_agent_logs").insert({
      conversation_id: conversationId,
      lead_id: leadId,
      agent_id: agent.id,
      log_type: "outside_hours",
      data: { timestamp: new Date().toISOString() },
    });
    await insertSystemMessage(supabase, leadId, `🕐 Agente IA: Mensagem recebida fora do horário de atendimento (${agent.settings.working_hours_start}-${agent.settings.working_hours_end}). Será respondida no próximo horário.`);
    return;
  }

  // 2. Check conversation status
  const { data: conversation } = await supabase
    .from("ai_agent_conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (!conversation || conversation.status !== "active") {
    console.log("Conversation not active:", conversation?.status);
    return;
  }

  // 3. Check max messages
  if (conversation.total_messages_sent >= agent.settings.max_messages_per_conversation) {
    console.log("Max messages reached, transferring to human");
    await supabase
      .from("ai_agent_conversations")
      .update({ status: "transferred", pause_reason: "Limite de mensagens atingido" })
      .eq("id", conversationId);
    await insertSystemMessage(supabase, leadId, `🔄 Agente IA transferiu para atendimento humano. Motivo: limite de ${agent.settings.max_messages_per_conversation} mensagens atingido.`);
    return;
  }

  // 4. Get instance config
  const instanceConfig = await getInstanceConfig(supabase, leadId);
  if (!instanceConfig) {
    console.error("No WhatsApp instance available for lead:", leadId);
    await insertSystemMessage(supabase, leadId, "⚠️ Agente IA: Nenhuma instância WhatsApp disponível para enviar resposta. Conecte uma instância em Configurações > WhatsApp.");
    return;
  }

  // 5. Rate limit check
  const withinLimit = await checkRateLimit(
    supabase,
    instanceConfig.instanceId,
    agent.settings.cadence_max_messages_per_hour,
    agent.settings.cadence_max_messages_per_day
  );
  if (!withinLimit) {
    console.log("Rate limit exceeded");
    await supabase.from("ai_agent_logs").insert({
      conversation_id: conversationId,
      lead_id: leadId,
      agent_id: agent.id,
      log_type: "rate_limit",
      data: { instance_id: instanceConfig.instanceId },
    });
    await insertSystemMessage(supabase, leadId, "⚠️ Agente IA: Limite de mensagens por hora/dia atingido. Aguardando reset automático.");
    return;
  }

  // 6. Gather context
  const context = await gatherContext(supabase, leadId, agent.settings);

  // 7. Build prompt
  const fullSystemPrompt = `${agent.system_prompt}

---
CONTEXTO ATUAL:
${context}

---
INSTRUÇÕES IMPORTANTES:
- Responda de forma natural e conversacional em português brasileiro
- Use emojis com moderação
- Seja direto e objetivo
- Não use markdown ou formatação especial
- Mantenha as mensagens curtas (máximo 300 caracteres por bloco)
- Hoje é ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
- Horário atual: ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;

  // 8. Build conversation history from lead_messages (always fresh, avoids stale/corrupt history)
  const conversationHistory: Array<{ role: string; content: string }> = [];
  {
    const limit = agent.settings.context_messages_limit || 50;
    const { data: recentMessages } = await supabase
      .from("lead_messages")
      .select("sender_type, message, direction")
      .eq("lead_id", leadId)
      .neq("sender_type", "system")
      .neq("direction", "internal")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (recentMessages && recentMessages.length > 0) {
      for (const msg of recentMessages) {
        const role =
          msg.direction === "incoming" || msg.sender_type === "lead"
            ? "user"
            : "assistant";
        // Avoid consecutive same-role messages (Claude API requirement)
        const lastMsg = conversationHistory[conversationHistory.length - 1];
        if (lastMsg && lastMsg.role === role) {
          lastMsg.content += "\n" + msg.message;
        } else {
          conversationHistory.push({ role, content: msg.message });
        }
      }
    }

    // Ensure at least one user message
    if (conversationHistory.length === 0) {
      conversationHistory.push({ role: "user", content: "Olá" });
    }

    // Ensure conversation ends with user message (Claude API requirement)
    if (conversationHistory[conversationHistory.length - 1].role !== "user") {
      // This shouldn't happen if there's a new incoming message, but just in case
      conversationHistory.push({ role: "user", content: "..." });
    }
  }

  // 9. Get tools
  const { data: dbTools } = await supabase
    .from("ai_agent_tools")
    .select("*")
    .eq("agent_id", agent.id)
    .eq("is_active", true);

  const tools: ToolDef[] = (dbTools || []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    parameters: t.parameters || {},
    action_type: t.action_type,
    action_config: t.action_config || {},
  }));

  // 10. Call Claude (with tool loop)
  let messages = [...conversationHistory];
  let finalResponse = "";
  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;

    const result = await callClaude(
      apiKey,
      agent.model,
      fullSystemPrompt,
      messages,
      tools,
      agent.temperature,
      agent.max_tokens
    );

    totalTokensIn += result.tokensInput;
    totalTokensOut += result.tokensOutput;

    // Capture any text content from this iteration
    if (result.content) {
      finalResponse = result.content;
    }

    if (result.toolCalls.length > 0) {
      // Process tool calls
      const assistantContent: unknown[] = [];
      if (result.content) {
        assistantContent.push({ type: "text", text: result.content });
      }
      for (const tc of result.toolCalls) {
        assistantContent.push({
          type: "tool_use",
          id: tc.id,
          name: tc.name,
          input: tc.input,
        });
      }
      messages.push({ role: "assistant", content: assistantContent as unknown as string });

      // Execute tools and build results
      const toolResults: unknown[] = [];
      for (const tc of result.toolCalls) {
        const toolDef = tools.find((t) => t.name === tc.name);
        let toolResult: string;

        if (toolDef) {
          try {
            toolResult = await executeTool(
              supabase,
              toolDef,
              tc.input,
              leadId,
              agent.id,
              conversationId,
              agent.settings
            );
          } catch (e) {
            toolResult = JSON.stringify({ error: String(e) });
          }

          // Log tool call
          await supabase.from("ai_agent_logs").insert({
            conversation_id: conversationId,
            lead_id: leadId,
            agent_id: agent.id,
            log_type: "tool_called",
            data: { tool: tc.name, input: tc.input, result: toolResult },
          });

          // Insert internal message so the sales team can see tool calls in the chat
          const toolLabel = formatToolLabel(tc.name, tc.input, toolResult);
          await supabase.from("lead_messages").insert({
            lead_id: leadId,
            sender_type: "system",
            message: toolLabel,
            direction: "internal",
            message_status: "delivered",
          });
        } else {
          toolResult = JSON.stringify({ error: `Tool not found: ${tc.name}` });
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: tc.id,
          content: toolResult,
        });
      }

      messages.push({ role: "user", content: toolResults as unknown as string });
    } else {
      // No tool calls, finalResponse already captured above
      break;
    }
  }

  if (!finalResponse) {
    console.error("No response generated after tool loop, all iterations returned empty text");
    finalResponse = agent.settings.fallback_message;
  }

  // 11. Send humanized response
  await sendHumanizedResponse(
    instanceConfig.phone,
    finalResponse,
    agent.settings,
    instanceConfig,
    supabase,
    leadId,
    instanceConfig.instanceId
  );

  // 12. Update conversation (history is rebuilt from lead_messages each time, so just update metadata)
  await supabase
    .from("ai_agent_conversations")
    .update({
      messages_history: [], // cleared - will be rebuilt from lead_messages on next call
      total_messages_sent: (conversation.total_messages_sent || 0) + 1,
      last_processed_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  // Increment rate limit counter
  await incrementSendCount(supabase, instanceConfig.instanceId);

  // 13. Log
  await supabase.from("ai_agent_logs").insert({
    conversation_id: conversationId,
    lead_id: leadId,
    agent_id: agent.id,
    log_type: "message_sent",
    data: { response: finalResponse.substring(0, 500), iterations },
    tokens_input: totalTokensIn,
    tokens_output: totalTokensOut,
  });
}

// ============================================
// Internal System Messages
// ============================================

async function insertSystemMessage(
  supabase: SupabaseClient,
  leadId: string,
  message: string,
  instanceId?: string
): Promise<void> {
  try {
    await supabase.from("lead_messages").insert({
      lead_id: leadId,
      sender_type: "system",
      message,
      direction: "internal",
      message_status: "delivered",
      whatsapp_instance_id: instanceId || null,
    });
  } catch (e) {
    console.error("Failed to insert system message:", e);
  }
}

// ============================================
// Action Handlers
// ============================================

async function handleProcessQueue(supabase: SupabaseClient): Promise<{ processed: number }> {
  // Get active agent
  const { data: agent } = await supabase
    .from("ai_sales_agents")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!agent) {
    console.log("No active agent found");
    return { processed: 0 };
  }

  // Recovery: stuck messages
  await supabase.rpc("process_ai_agent_queue");

  // Claim messages
  const { data: messages } = await supabase.rpc("claim_queue_messages", {
    p_batch_size: agent.settings?.queue_batch_size || 5,
  });

  if (!messages || messages.length === 0) {
    // Also check for scheduled followups
    const { data: followups } = await supabase.rpc("claim_scheduled_followups", { p_batch_size: 3 });
    if (followups && followups.length > 0) {
      for (const f of followups) {
        try {
          await processFollowup(supabase, f, agent);
          await supabase
            .from("ai_agent_scheduled_followups")
            .update({ status: "completed" })
            .eq("id", f.id);
        } catch (e) {
          console.error("Followup processing error:", e);
          await supabase
            .from("ai_agent_scheduled_followups")
            .update({ status: "pending" })
            .eq("id", f.id);
        }
      }
    }
    return { processed: 0 };
  }

  // Get API key
  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not configured");
    // Mark messages as failed and notify
    for (const msg of messages) {
      await supabase
        .from("ai_agent_message_queue")
        .update({ status: "failed", error_message: "API key not configured" })
        .eq("id", msg.id);
      await insertSystemMessage(supabase, msg.lead_id, "⚠️ Agente IA: API key da Anthropic não configurada. Configure em Configurações > Integrações.");
    }
    return { processed: 0 };
  }

  // Group messages by lead (process each lead once)
  const leadMessages = new Map<string, QueueMessage>();
  for (const msg of messages) {
    leadMessages.set(msg.lead_id, msg); // Latest message per lead
  }

  let processed = 0;
  for (const [leadId, msg] of leadMessages) {
    try {
      // Acquire lock
      const { data: lockAcquired } = await supabase.rpc("try_acquire_agent_lock", {
        p_lead_id: leadId,
        p_lock_duration: `${agent.settings?.lock_duration_seconds || 30} seconds`,
      });

      if (!lockAcquired) {
        console.log("Could not acquire lock for lead:", leadId);
        await supabase
          .from("ai_agent_message_queue")
          .update({ status: "pending" })
          .eq("id", msg.id);
        continue;
      }

      try {
        await processLeadMessage(supabase, leadId, agent, apiKey, msg.conversation_id);
        await supabase
          .from("ai_agent_message_queue")
          .update({ status: "completed", processed_at: new Date().toISOString() })
          .eq("id", msg.id);
        processed++;
      } finally {
        // Always release lock
        await supabase.rpc("release_agent_lock", { p_lead_id: leadId });
      }
    } catch (error) {
      console.error(`Error processing lead ${leadId}:`, error);
      const errorStr = String(error);
      const isFinal = msg.attempts >= (msg.max_attempts || 3);
      await supabase
        .from("ai_agent_message_queue")
        .update({
          status: isFinal ? "failed" : "pending",
          error_message: errorStr,
        })
        .eq("id", msg.id);

      // Insert system message on final failure
      if (isFinal) {
        let userMessage = "⚠️ Agente IA falhou ao processar mensagem.";
        if (errorStr.includes("credit balance is too low")) {
          userMessage = "⚠️ Agente IA: Sem créditos na API Anthropic. Recarregue em console.anthropic.com para o agente voltar a funcionar.";
        } else if (errorStr.includes("rate_limit") || errorStr.includes("429")) {
          userMessage = "⚠️ Agente IA: Limite de requisições da API atingido. Tentando novamente em breve.";
        } else if (errorStr.includes("authentication") || errorStr.includes("401")) {
          userMessage = "⚠️ Agente IA: API key inválida. Verifique a configuração em Configurações > Integrações.";
        }
        await insertSystemMessage(supabase, leadId, userMessage);
      }
    }
  }

  return { processed };
}

async function processFollowup(
  supabase: SupabaseClient,
  followup: { id: string; lead_id: string; conversation_id: string; agent_id: string; context_note: string },
  agent: AgentConfig
): Promise<void> {
  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) return;

  // Add followup context as a user message
  const { data: conversation } = await supabase
    .from("ai_agent_conversations")
    .select("*")
    .eq("id", followup.conversation_id)
    .single();

  if (!conversation || conversation.status !== "active") return;

  const history = [...(conversation.messages_history || [])];
  history.push({
    role: "user",
    content: `[SISTEMA] Followup agendado. Contexto: ${followup.context_note}. Envie uma mensagem de acompanhamento ao lead.`,
  });

  await supabase
    .from("ai_agent_conversations")
    .update({ messages_history: history })
    .eq("id", followup.conversation_id);

  await processLeadMessage(supabase, followup.lead_id, agent, apiKey, followup.conversation_id);
}

async function handleProcessCadence(supabase: SupabaseClient): Promise<{ processed: number }> {
  const { data: agent } = await supabase
    .from("ai_sales_agents")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!agent) return { processed: 0 };

  const { data: enrollments } = await supabase
    .from("ai_agent_cadence_enrollments")
    .select("*")
    .eq("status", "active")
    .lte("next_action_at", new Date().toISOString())
    .limit(10);

  if (!enrollments || enrollments.length === 0) return { processed: 0 };

  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) return { processed: 0 };

  let processed = 0;

  for (const enrollment of enrollments) {
    try {
      const steps = agent.cadence_steps?.[enrollment.stage] as CadenceStep[] | undefined;
      if (!steps || enrollment.current_step >= steps.length) {
        await supabase
          .from("ai_agent_cadence_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);
        continue;
      }

      const step = steps[enrollment.current_step];

      // Check only_if_no_reply
      if (step.only_if_no_reply) {
        const { data: recentMessages } = await supabase
          .from("lead_messages")
          .select("id")
          .eq("lead_id", enrollment.lead_id)
          .eq("direction", "incoming")
          .gte("created_at", enrollment.enrolled_at)
          .limit(1);

        if (recentMessages && recentMessages.length > 0) {
          await supabase
            .from("ai_agent_cadence_enrollments")
            .update({ status: "replied" })
            .eq("id", enrollment.id);
          continue;
        }
      }

      // Get or create conversation for cadence
      let conversation;
      const { data: existingConv } = await supabase
        .from("ai_agent_conversations")
        .select("id")
        .eq("lead_id", enrollment.lead_id)
        .eq("agent_id", agent.id)
        .in("status", ["active", "paused_by_schedule"])
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        conversation = existingConv;
        // Reactivate if paused
        await supabase
          .from("ai_agent_conversations")
          .update({ status: "active" })
          .eq("id", conversation.id);
      } else {
        const { data: newConv } = await supabase
          .from("ai_agent_conversations")
          .insert({
            lead_id: enrollment.lead_id,
            agent_id: agent.id,
            status: "active",
          })
          .select("id")
          .single();
        conversation = newConv;
      }

      if (!conversation) continue;

      // Get instance config
      const instanceConfig = await getInstanceConfig(supabase, enrollment.lead_id);
      if (!instanceConfig) continue;

      // Rate limit check
      const withinLimit = await checkRateLimit(
        supabase,
        instanceConfig.instanceId,
        agent.settings?.cadence_max_messages_per_hour || 50,
        agent.settings?.cadence_max_messages_per_day || 60
      );
      if (!withinLimit) continue;

      // Generate message based on step content
      if (step.action_type === "ai_message") {
        // Use Claude to generate a natural message based on the step content
        const context = await gatherContext(supabase, enrollment.lead_id, agent.settings);
        const cadencePrompt = `${agent.system_prompt}

---
CONTEXTO ATUAL:
${context}

---
INSTRUÇÃO DE CADÊNCIA:
Este é o step ${enrollment.current_step + 1} da cadência para o estágio "${enrollment.stage}".
Objetivo da mensagem: ${step.content}
${step.caption ? `Contexto adicional: ${step.caption}` : ""}

Gere UMA mensagem natural e conversacional para enviar ao lead. NÃO use markdown.`;

        const result = await callClaude(
          apiKey,
          agent.model,
          cadencePrompt,
          [{ role: "user", content: "Gere a mensagem de cadência conforme instruído." }],
          [],
          agent.temperature,
          agent.max_tokens
        );

        if (result.content) {
          await sendHumanizedResponse(
            instanceConfig.phone,
            result.content,
            agent.settings,
            instanceConfig,
            supabase,
            enrollment.lead_id,
            instanceConfig.instanceId
          );
        }
      } else if (step.action_type === "template_message") {
        // Send template directly
        await sendHumanizedResponse(
          instanceConfig.phone,
          step.content,
          agent.settings,
          instanceConfig,
          supabase,
          enrollment.lead_id,
          instanceConfig.instanceId
        );
      }

      // Advance step
      const nextStep = enrollment.current_step + 1;
      if (nextStep >= steps.length) {
        // Cadence complete
        await supabase
          .from("ai_agent_cadence_enrollments")
          .update({
            status: "completed",
            current_step: nextStep,
            last_step_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id);

        // Execute post_action if exists
        if (step.post_action?.type === "move_stage" && step.post_action?.target_stage) {
          await supabase
            .from("leads")
            .update({ status: step.post_action.target_stage })
            .eq("id", enrollment.lead_id);
        }
      } else {
        // Schedule next step
        const nextStepConfig = steps[nextStep];
        const nextActionAt = new Date(
          Date.now() + (nextStepConfig?.delay_minutes || 60) * 60 * 1000
        ).toISOString();

        await supabase
          .from("ai_agent_cadence_enrollments")
          .update({
            current_step: nextStep,
            next_action_at: nextActionAt,
            last_step_at: new Date().toISOString(),
          })
          .eq("id", enrollment.id);
      }

      // Log
      await supabase.from("ai_agent_logs").insert({
        conversation_id: conversation.id,
        lead_id: enrollment.lead_id,
        agent_id: agent.id,
        log_type: "cadence_step",
        data: { stage: enrollment.stage, step: enrollment.current_step, step_config: step },
      });

      await incrementSendCount(supabase, instanceConfig.instanceId);
      processed++;
    } catch (error) {
      console.error(`Cadence error for enrollment ${enrollment.id}:`, error);
    }
  }

  return { processed };
}

async function handleProcessDirect(
  supabase: SupabaseClient,
  leadId: string,
  userId?: string
): Promise<{ success: boolean }> {
  const { data: agent } = await supabase
    .from("ai_sales_agents")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!agent) throw new Error("No active agent");

  const apiKey = await getIntegrationKeyWithClient(supabase, "anthropic", "api_key", "ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Get or create conversation
  let { data: conversation } = await supabase
    .from("ai_agent_conversations")
    .select("*")
    .eq("lead_id", leadId)
    .eq("agent_id", agent.id)
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv } = await supabase
      .from("ai_agent_conversations")
      .insert({
        lead_id: leadId,
        agent_id: agent.id,
        status: "active",
      })
      .select("*")
      .single();
    conversation = newConv;
  } else if (conversation.status !== "active") {
    await supabase
      .from("ai_agent_conversations")
      .update({ status: "active", paused_by: null, pause_reason: null })
      .eq("id", conversation.id);
  }

  if (!conversation) throw new Error("Could not create conversation");

  // Acquire lock
  const { data: lockAcquired } = await supabase.rpc("try_acquire_agent_lock", {
    p_lead_id: leadId,
  });

  if (!lockAcquired) throw new Error("Could not acquire lock");

  try {
    await processLeadMessage(supabase, leadId, agent, apiKey, conversation.id);
    return { success: true };
  } finally {
    await supabase.rpc("release_agent_lock", { p_lead_id: leadId });
  }
}

async function handleToggleConversation(
  supabase: SupabaseClient,
  leadId: string,
  action: "pause" | "resume" | "activate",
  userId?: string,
  reason?: string,
  agentId?: string
): Promise<{ success: boolean; status: string }> {
  let selectedAgentId = agentId;

  if (!selectedAgentId) {
    // Fallback: first active agent
    const { data: agent } = await supabase
      .from("ai_sales_agents")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .single();
    if (!agent) throw new Error("No active agent");
    selectedAgentId = agent.id;
  }

  const agent = { id: selectedAgentId };

  if (action === "activate") {
    // Create new conversation
    const { data: existing } = await supabase
      .from("ai_agent_conversations")
      .select("id, status")
      .eq("lead_id", leadId)
      .eq("agent_id", agent.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("ai_agent_conversations")
        .update({
          status: "active",
          paused_by: null,
          pause_reason: null,
          paused_at: null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("ai_agent_conversations").insert({
        lead_id: leadId,
        agent_id: agent.id,
        status: "active",
      });
    }

    return { success: true, status: "active" };
  }

  if (action === "pause") {
    await supabase
      .from("ai_agent_conversations")
      .update({
        status: "paused_by_human",
        paused_by: userId || null,
        paused_at: new Date().toISOString(),
        pause_reason: reason || "Pausado manualmente",
      })
      .eq("lead_id", leadId)
      .eq("agent_id", agent.id);

    return { success: true, status: "paused_by_human" };
  }

  if (action === "resume") {
    await supabase
      .from("ai_agent_conversations")
      .update({
        status: "active",
        paused_by: null,
        pause_reason: null,
        paused_at: null,
      })
      .eq("lead_id", leadId)
      .eq("agent_id", agent.id);

    return { success: true, status: "active" };
  }

  throw new Error("Invalid action");
}

// ============================================
// Main Handler
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "process_queue";

    console.log(`AI Sales Agent action: ${action}`, {
      lead_id: body.lead_id,
      hasAuth: Boolean(req.headers.get("Authorization")),
    });

    let result: unknown;

    switch (action) {
      case "process_queue":
        result = await handleProcessQueue(supabase);
        break;

      case "process_cadence":
        result = await handleProcessCadence(supabase);
        break;

      case "process_direct":
        if (!body.lead_id) throw new Error("lead_id required");
        result = await handleProcessDirect(supabase, body.lead_id, body.user_id);
        break;

      case "toggle_conversation":
        if (!body.lead_id) throw new Error("lead_id required");
        result = await handleToggleConversation(
          supabase,
          body.lead_id,
          body.toggle_action || "pause",
          body.user_id,
          body.reason,
          body.agent_id
        );
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Sales Agent error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
