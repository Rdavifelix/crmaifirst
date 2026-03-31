-- ============================================
-- AI Sales Agent - Migration Completa
-- ============================================

-- 1. Estágios do Pipeline (configuráveis)
CREATE TABLE IF NOT EXISTS sales_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_terminal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Estágios padrão (mapeiam aos status existentes)
INSERT INTO sales_pipeline_stages (name, display_name, sort_order, is_terminal) VALUES
  ('new', 'Novo', 0, false),
  ('first_contact', 'Primeiro Contato', 1, false),
  ('negotiating', 'Em Negociação', 2, false),
  ('proposal_sent', 'Proposta Enviada', 3, false),
  ('follow_up', 'Follow-up', 4, false),
  ('won', 'Ganho', 5, true),
  ('lost', 'Perdido', 6, true)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE sales_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read stages" ON sales_pipeline_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage stages" ON sales_pipeline_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Agentes IA de Vendas
CREATE TABLE ai_sales_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL DEFAULT '',
  personality_traits JSONB DEFAULT '[]',
  target_stages TEXT[] DEFAULT ARRAY['new','first_contact'],
  settings JSONB DEFAULT '{
    "working_hours_start": "08:00",
    "working_hours_end": "23:00",
    "working_days": [0,1,2,3,4,5,6],
    "debounce_seconds": 30,
    "response_delay_min_ms": 2000,
    "response_delay_max_ms": 5000,
    "typing_speed_cpm": 300,
    "message_split_max_length": 300,
    "delay_between_messages_min_ms": 500,
    "delay_between_messages_max_ms": 1500,
    "context_messages_limit": 250,
    "max_messages_per_conversation": 50,
    "auto_pause_after_human_reply": true,
    "lock_duration_seconds": 30,
    "max_retry_attempts": 3,
    "queue_batch_size": 5,
    "meeting_duration_minutes": 45,
    "cadence_silence_timeout_minutes": 720,
    "cadence_reactivation_map": {},
    "cadence_max_messages_per_hour": 50,
    "cadence_max_messages_per_day": 60,
    "fallback_message": "Desculpe, tive um problema técnico. Um atendente vai te ajudar em breve!"
  }'::jsonb,
  model TEXT DEFAULT 'claude-sonnet-4-6',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  is_active BOOLEAN DEFAULT true,
  cadence_steps JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_sales_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agents" ON ai_sales_agents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Conversas do Agente por Lead
CREATE TABLE ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_sales_agents(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  messages_history JSONB DEFAULT '[]',
  total_messages_sent INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  paused_by UUID,
  paused_at TIMESTAMPTZ,
  pause_reason TEXT,
  last_processed_at TIMESTAMPTZ,
  last_message_id UUID,
  metadata JSONB DEFAULT '{}',
  processing_lock TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, agent_id)
);

CREATE INDEX idx_ai_agent_conversations_lead ON ai_agent_conversations(lead_id);
CREATE INDEX idx_ai_agent_conversations_status ON ai_agent_conversations(status);

ALTER TABLE ai_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage conversations" ON ai_agent_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Fila de Mensagens com Debounce
CREATE TABLE ai_agent_message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES lead_messages(id),
  conversation_id UUID REFERENCES ai_agent_conversations(id),
  message_content TEXT,
  message_metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_agent_message_queue_lead ON ai_agent_message_queue(lead_id);
CREATE INDEX idx_ai_agent_message_queue_scheduled ON ai_agent_message_queue(scheduled_for) WHERE status = 'pending';

ALTER TABLE ai_agent_message_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read queue" ON ai_agent_message_queue FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages queue" ON ai_agent_message_queue FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Cadência Outbound
CREATE TABLE ai_agent_cadence_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES ai_sales_agents(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  next_action_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  last_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id, agent_id, stage)
);

CREATE INDEX idx_cadence_agent ON ai_agent_cadence_enrollments(agent_id);
CREATE INDEX idx_cadence_lead ON ai_agent_cadence_enrollments(lead_id);
CREATE INDEX idx_cadence_next ON ai_agent_cadence_enrollments(next_action_at) WHERE status = 'active';

ALTER TABLE ai_agent_cadence_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cadence" ON ai_agent_cadence_enrollments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Tools do Agente (Function Calling)
CREATE TABLE ai_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES ai_sales_agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  parameters JSONB DEFAULT '{"type":"object","required":[],"properties":{}}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tools" ON ai_agent_tools FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Logs e Telemetria
CREATE TABLE ai_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  agent_id UUID REFERENCES ai_sales_agents(id),
  log_type TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  tokens_input INTEGER,
  tokens_output INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_agent_logs_conversation ON ai_agent_logs(conversation_id);
CREATE INDEX idx_ai_agent_logs_created ON ai_agent_logs(created_at DESC);

ALTER TABLE ai_agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read logs" ON ai_agent_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role manages logs" ON ai_agent_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Follow-ups Agendados
CREATE TABLE ai_agent_scheduled_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_agent_conversations(id),
  agent_id UUID REFERENCES ai_sales_agents(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  context_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_followups_lead ON ai_agent_scheduled_followups(lead_id);
CREATE INDEX idx_followups_pending ON ai_agent_scheduled_followups(status, scheduled_at) WHERE status = 'pending';

ALTER TABLE ai_agent_scheduled_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage followups" ON ai_agent_scheduled_followups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. Rate Limiting de Envios
CREATE TABLE ai_agent_send_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_type VARCHAR NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, window_start, window_type)
);

CREATE INDEX idx_send_counts_lookup ON ai_agent_send_counts(instance_id, window_type, window_start);

ALTER TABLE ai_agent_send_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages send counts" ON ai_agent_send_counts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- RPCs (Funções PostgreSQL)
-- ============================================

-- Lock de Concorrência
CREATE OR REPLACE FUNCTION try_acquire_agent_lock(
  p_lead_id UUID,
  p_lock_duration INTERVAL DEFAULT '30 seconds'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_acquired BOOLEAN := false;
BEGIN
  UPDATE ai_agent_conversations
  SET processing_lock = now()
  WHERE lead_id = p_lead_id
    AND status = 'active'
    AND (processing_lock IS NULL OR processing_lock < now() - p_lock_duration)
  RETURNING true INTO v_acquired;
  RETURN COALESCE(v_acquired, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION release_agent_lock(p_lead_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE ai_agent_conversations
  SET processing_lock = NULL
  WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fila de Mensagens (Debounce)
CREATE OR REPLACE FUNCTION enqueue_message_for_ai_agent(
  p_lead_id UUID,
  p_message_id UUID,
  p_message_content TEXT,
  p_debounce_seconds INT DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
  v_conversation_id UUID;
  v_agent_active BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM ai_sales_agents WHERE is_active = true) INTO v_agent_active;
  IF NOT v_agent_active THEN RETURN NULL; END IF;

  SELECT id INTO v_conversation_id
  FROM ai_agent_conversations
  WHERE lead_id = p_lead_id AND status = 'active'
  LIMIT 1;

  IF v_conversation_id IS NULL THEN RETURN NULL; END IF;

  -- Cancelar pendentes anteriores (debounce)
  UPDATE ai_agent_message_queue
  SET status = 'cancelled'
  WHERE lead_id = p_lead_id AND status = 'pending';

  INSERT INTO ai_agent_message_queue (lead_id, message_id, conversation_id, message_content, scheduled_for)
  VALUES (p_lead_id, p_message_id, v_conversation_id, p_message_content, now() + (p_debounce_seconds || ' seconds')::interval)
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim de Mensagens (Atômico)
CREATE OR REPLACE FUNCTION claim_queue_messages(p_batch_size INT DEFAULT 10)
RETURNS SETOF ai_agent_message_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE ai_agent_message_queue
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM ai_agent_message_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
      AND attempts < max_attempts
    ORDER BY scheduled_for ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Claim de Followups
CREATE OR REPLACE FUNCTION claim_scheduled_followups(p_batch_size INT DEFAULT 5)
RETURNS SETOF ai_agent_scheduled_followups AS $$
BEGIN
  RETURN QUERY
  UPDATE ai_agent_scheduled_followups
  SET status = 'processing', attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM ai_agent_scheduled_followups
    WHERE status = 'pending'
      AND scheduled_at <= now()
      AND attempts < 3
    ORDER BY scheduled_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recovery de Fila
CREATE OR REPLACE FUNCTION process_ai_agent_queue()
RETURNS VOID AS $$
BEGIN
  UPDATE ai_agent_message_queue
  SET status = 'pending'
  WHERE status = 'processing'
    AND processed_at IS NULL
    AND created_at < now() - interval '3 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Status do Agente para Frontend
CREATE OR REPLACE FUNCTION get_ai_agent_status_for_lead(p_lead_id UUID)
RETURNS TABLE (
  has_agent BOOLEAN,
  agent_name TEXT,
  conversation_status TEXT,
  messages_sent INTEGER,
  last_processed_at TIMESTAMPTZ,
  is_paused BOOLEAN,
  paused_by_name TEXT,
  pause_reason TEXT
) AS $$
DECLARE
  v_count INT;
BEGIN
  RETURN QUERY
  SELECT
    true AS has_agent,
    a.name AS agent_name,
    c.status AS conversation_status,
    c.total_messages_sent AS messages_sent,
    c.last_processed_at,
    c.status IN ('paused_by_human', 'paused_by_schedule') AS is_paused,
    p.full_name AS paused_by_name,
    c.pause_reason
  FROM ai_agent_conversations c
  JOIN ai_sales_agents a ON a.id = c.agent_id
  LEFT JOIN profiles p ON p.user_id = c.paused_by
  WHERE c.lead_id = p_lead_id
    AND a.is_active = true
  ORDER BY c.created_at DESC
  LIMIT 1;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT, 0, NULL::TIMESTAMPTZ, false, NULL::TEXT, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Enfileira mensagens inbound para o agente IA
CREATE OR REPLACE FUNCTION trigger_enqueue_for_ai_agent()
RETURNS TRIGGER AS $$
DECLARE
  v_agent RECORD;
  v_debounce INT;
  v_reactivation_map JSONB;
  v_current_status TEXT;
  v_target_status TEXT;
BEGIN
  -- Ignorar mensagens outgoing ou sem lead
  IF NEW.direction = 'outgoing' OR NEW.lead_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar agente ativo
  SELECT * INTO v_agent FROM ai_sales_agents WHERE is_active = true LIMIT 1;
  IF v_agent IS NULL THEN RETURN NEW; END IF;

  -- Parar cadências ativas do lead (lead respondeu)
  UPDATE ai_agent_cadence_enrollments
  SET status = 'replied', updated_at = now()
  WHERE lead_id = NEW.lead_id AND status = 'active';

  -- Reativação: se lead está em estágio terminal e respondeu, mover de volta
  v_reactivation_map := v_agent.settings->'cadence_reactivation_map';
  IF v_reactivation_map IS NOT NULL AND jsonb_typeof(v_reactivation_map) = 'object' THEN
    SELECT l.status INTO v_current_status FROM leads l WHERE l.id = NEW.lead_id;
    v_target_status := v_reactivation_map->>v_current_status;
    IF v_target_status IS NOT NULL THEN
      UPDATE leads SET status = v_target_status WHERE id = NEW.lead_id;
    END IF;
  END IF;

  -- Debounce dinâmico
  v_debounce := COALESCE((v_agent.settings->>'debounce_seconds')::INT, 30);

  -- Enfileirar
  PERFORM enqueue_message_for_ai_agent(NEW.lead_id, NEW.id, NEW.message, v_debounce);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enqueue_for_ai_agent
  AFTER INSERT ON lead_messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_enqueue_for_ai_agent();

-- Trigger: Enrollment automático em cadência quando status muda
CREATE OR REPLACE FUNCTION enroll_lead_in_cadence()
RETURNS TRIGGER AS $$
DECLARE
  v_agent RECORD;
  v_steps JSONB;
  v_has_meeting BOOLEAN;
BEGIN
  -- Só roda em mudança de status
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_agent FROM ai_sales_agents WHERE is_active = true LIMIT 1;
  IF v_agent IS NULL THEN RETURN NEW; END IF;

  -- Verificar se tem cadência pra esse status
  v_steps := v_agent.cadence_steps->NEW.status;
  IF v_steps IS NULL OR jsonb_array_length(v_steps) = 0 THEN RETURN NEW; END IF;

  -- Skip se tem reunião agendada
  SELECT EXISTS(
    SELECT 1 FROM lead_tasks
    WHERE lead_id = NEW.id
      AND type IN ('call', 'meeting')
      AND status IN ('pending', 'in_progress')
      AND scheduled_at > now()
  ) INTO v_has_meeting;
  IF v_has_meeting THEN RETURN NEW; END IF;

  -- Cancelar enrollments ativos anteriores
  UPDATE ai_agent_cadence_enrollments
  SET status = 'cancelled', updated_at = now()
  WHERE lead_id = NEW.id AND status = 'active';

  -- Criar enrollment novo
  INSERT INTO ai_agent_cadence_enrollments (lead_id, agent_id, stage, current_step, next_action_at)
  VALUES (
    NEW.id,
    v_agent.id,
    NEW.status,
    0,
    now() + ((v_steps->0->>'delay_minutes')::INT || ' minutes')::interval
  )
  ON CONFLICT (lead_id, agent_id, stage) DO UPDATE SET
    status = 'active',
    current_step = 0,
    next_action_at = now() + ((v_steps->0->>'delay_minutes')::INT || ' minutes')::interval,
    completed_at = NULL,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_enroll_lead_in_cadence
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION enroll_lead_in_cadence();

-- Triggers updated_at
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_agent_conversations_updated_at BEFORE UPDATE ON ai_agent_conversations FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();
CREATE TRIGGER update_ai_agent_tools_updated_at BEFORE UPDATE ON ai_agent_tools FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();
CREATE TRIGGER update_ai_sales_agents_updated_at BEFORE UPDATE ON ai_sales_agents FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();
CREATE TRIGGER update_cadence_enrollments_updated_at BEFORE UPDATE ON ai_agent_cadence_enrollments FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON sales_pipeline_stages FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

-- ============================================
-- VIEW - Dashboard do Agente
-- ============================================
CREATE OR REPLACE VIEW v_ai_agent_dashboard AS
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  a.is_active,
  count(DISTINCT c.id) AS total_conversations,
  count(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) AS active_conversations,
  count(DISTINCT CASE WHEN c.status = 'paused_by_human' THEN c.id END) AS paused_conversations,
  COALESCE(sum(c.total_messages_sent), 0) AS total_messages_sent,
  count(DISTINCT q.id) FILTER (WHERE q.status = 'pending') AS pending_in_queue,
  count(DISTINCT q.id) FILTER (WHERE q.status = 'failed') AS failed_in_queue
FROM ai_sales_agents a
LEFT JOIN ai_agent_conversations c ON c.agent_id = a.id
LEFT JOIN ai_agent_message_queue q ON q.lead_id = c.lead_id
GROUP BY a.id, a.name, a.is_active;

-- ============================================
-- REALTIME (safe - ignores if already added)
-- ============================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_agent_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_sales_agents;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE sales_pipeline_stages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
