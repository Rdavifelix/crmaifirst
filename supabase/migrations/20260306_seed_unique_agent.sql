-- =============================================
-- SEED: Agente IA de Vendas - Unique Cirurgia Plastica Avancada
-- =============================================

-- Inserir agente (so se nao existir nenhum)
INSERT INTO ai_sales_agents (
  name,
  description,
  system_prompt,
  personality_traits,
  target_stages,
  model,
  temperature,
  max_tokens,
  is_active,
  settings,
  cadence_steps
) SELECT
  'Ana - Consultora Unique',
  'Agente IA de vendas da Unique Cirurgia Plastica Avancada. Especialista em acolhimento, qualificacao e agendamento de avaliacoes.',
  E'Voce e a Ana, consultora virtual da Unique Cirurgia Plastica Avancada, o primeiro complexo de Cirurgia Plastica Integrativa do mundo, localizado em Uberlandia-MG.\n\n## SOBRE A UNIQUE\n- Fundada pelo Dr. Andre Oliveira, criador do Metodo CPI (Cirurgia Plastica Integrativa)\n- Filosofia: "Nao existe corpo dos sonhos com um organismo em desequilibrio"\n- Atendemos pacientes de mais de 25 paises, mais de 20.000 pacientes atendidos\n- Endereco: Av. Getulio Vargas, 955 - Centro, Uberlandia-MG\n- Horario: Seg-Sex 8h-18h30, Sab 8h-12h\n- WhatsApp: (34) 98861-0000\n\n## SERVICOS PRINCIPAIS\n**Cirurgias Corporais:** Lipoescultura Ultra HD, abdominoplastia, remodelacao glutea, lifting mamario, protese de silicone R24R, remodelacao de costelas, Mommy Makeover\n**Cirurgias Faciais:** Lifting facial, rinoplastia, otoplastia, blefaroplastia, mentoplastia\n**Procedimentos Integrativos:** Harmonizacao facial (Ultraformer, microagulhamento robotico, fios PDO), nutrologia, terapias injetaveis, soroterapia, spa\n**Outros:** Transplante capilar, implantes hormonais, dermatologia\n\n## METODO CPI\nO diferencial da Unique e o Metodo CPI que integra cirurgia + nutricao + protocolo de recuperacao 3R. Avaliamos 7 pilares da saude do paciente antes de qualquer procedimento. O Diagnostico CPI e gratuito.\n\n## SEU OBJETIVO\n1. Acolher o lead com empatia e calor humano\n2. Entender o que o lead deseja (qual procedimento, motivacao)\n3. Qualificar: cidade/estado, se ja fez procedimentos antes, expectativa\n4. Convidar para agendar uma avaliacao/Diagnostico CPI gratuito\n5. Se o lead estiver em outra cidade, informar que atendemos pacientes de todo o Brasil e de fora, com programa Unique Travel\n\n## REGRAS DE COMUNICACAO\n- Seja acolhedora, empatica e profissional\n- Use linguagem acessivel, nao use termos medicos complexos sem explicar\n- NUNCA fale precos de cirurgias (diga que depende da avaliacao personalizada)\n- NUNCA de diagnosticos medicos ou prometa resultados\n- Se perguntarem algo que voce nao sabe, diga que vai verificar com a equipe\n- Maximo 2-3 frases por mensagem, seja objetiva\n- Use emojis com moderacao (1-2 por mensagem no maximo)\n- Chame pelo primeiro nome do lead quando possivel\n- Se o lead demonstrar urgencia ou problema de saude, transfira para atendimento humano imediatamente\n\n## FLUXO DE CONVERSA\n1. Cumprimento caloroso + perguntar como pode ajudar\n2. Escutar o desejo do lead\n3. Explicar brevemente o diferencial da Unique e do Metodo CPI\n4. Perguntar de onde e (cidade/estado)\n5. Convidar para o Diagnostico CPI gratuito\n6. Agendar horario da avaliacao\n7. Confirmar dados e se despedir com carinho',
  '["acolhedora", "empatica", "profissional", "objetiva", "calorosa"]'::jsonb,
  ARRAY['new', 'first_contact', 'negotiating', 'follow_up'],
  'claude-sonnet-4-6',
  0.7,
  1024,
  true,
  jsonb_build_object(
    'working_hours_start', '08:00',
    'working_hours_end', '22:00',
    'working_days', '[1,2,3,4,5,6]'::jsonb,
    'debounce_seconds', 30,
    'response_delay_min_ms', 2000,
    'response_delay_max_ms', 5000,
    'typing_speed_cpm', 280,
    'message_split_max_length', 250,
    'delay_between_messages_min_ms', 500,
    'delay_between_messages_max_ms', 1500,
    'context_messages_limit', 250,
    'max_messages_per_conversation', 60,
    'auto_pause_after_human_reply', true,
    'lock_duration_seconds', 30,
    'max_retry_attempts', 3,
    'queue_batch_size', 5,
    'meeting_duration_minutes', 45,
    'cadence_silence_timeout_minutes', 720,
    'cadence_reactivation_map', '{}'::jsonb,
    'cadence_max_messages_per_hour', 50,
    'cadence_max_messages_per_day', 60,
    'fallback_message', 'Desculpe, tive um probleminha tecnico. Vou pedir para uma das nossas consultoras te atender, ta? Um momento! 💜'
  ),
  '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ai_sales_agents LIMIT 1);

-- Inserir ferramentas padrao para o agente
DO $$
DECLARE
  v_agent_id uuid;
BEGIN
  SELECT id INTO v_agent_id FROM ai_sales_agents LIMIT 1;

  IF v_agent_id IS NULL THEN
    RAISE NOTICE 'Nenhum agente encontrado, pulando ferramentas';
    RETURN;
  END IF;

  -- Só insere se não tiver ferramentas ainda
  IF EXISTS (SELECT 1 FROM ai_agent_tools WHERE agent_id = v_agent_id LIMIT 1) THEN
    RAISE NOTICE 'Ferramentas já existem, pulando';
    RETURN;
  END IF;

  INSERT INTO ai_agent_tools (agent_id, name, description, parameters, action_type, action_config, priority, is_active) VALUES
  (v_agent_id, 'qualify_bant', 'Registra informacoes de qualificacao do lead: orcamento, necessidade, interesse, urgencia',
   '{"type":"object","properties":{"budget":{"type":"string","description":"Faixa de investimento do lead"},"need":{"type":"string","description":"Procedimento desejado"},"interest_level":{"type":"string","enum":["low","medium","high"],"description":"Nivel de interesse"},"urgency":{"type":"string","description":"Urgencia do lead"}}}'::jsonb,
   'qualify_bant', '{}'::jsonb, 1, true),

  (v_agent_id, 'update_lead', 'Atualiza dados do lead como nome, email, telefone, cidade, notas',
   '{"type":"object","properties":{"name":{"type":"string"},"email":{"type":"string"},"city":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
   'update_lead', '{}'::jsonb, 2, true),

  (v_agent_id, 'check_availability', 'Verifica horarios disponiveis para agendamento de avaliacao',
   '{"type":"object","properties":{"date":{"type":"string","description":"Data desejada YYYY-MM-DD"},"period":{"type":"string","enum":["morning","afternoon"]}}}'::jsonb,
   'check_availability', '{}'::jsonb, 3, true),

  (v_agent_id, 'schedule_meeting', 'Agenda uma avaliacao/Diagnostico CPI com o lead',
   '{"type":"object","properties":{"title":{"type":"string"},"date":{"type":"string"},"time":{"type":"string"},"notes":{"type":"string"}}}'::jsonb,
   'schedule_meeting', '{}'::jsonb, 4, true),

  (v_agent_id, 'change_stage', 'Move o lead para outro estagio do funil de vendas',
   '{"type":"object","properties":{"stage":{"type":"string","description":"Nome do estagio destino"}},"required":["stage"]}'::jsonb,
   'change_stage', '{}'::jsonb, 5, true),

  (v_agent_id, 'notify_human', 'Transfere para atendimento humano quando necessario',
   '{"type":"object","properties":{"reason":{"type":"string","description":"Motivo da transferencia"},"priority":{"type":"string","enum":["low","medium","high","urgent"]}},"required":["reason"]}'::jsonb,
   'notify_human', '{}'::jsonb, 6, true),

  (v_agent_id, 'mark_lost', 'Marca o lead como perdido com motivo',
   '{"type":"object","properties":{"reason":{"type":"string","description":"Motivo da perda"}},"required":["reason"]}'::jsonb,
   'mark_lost', '{}'::jsonb, 7, true),

  (v_agent_id, 'schedule_followup', 'Agenda um follow-up futuro para o lead',
   '{"type":"object","properties":{"minutes":{"type":"number","description":"Minutos para aguardar"},"message_hint":{"type":"string","description":"Orientacao para a mensagem de follow-up"}},"required":["minutes"]}'::jsonb,
   'schedule_followup', '{}'::jsonb, 8, true);
END $$;
