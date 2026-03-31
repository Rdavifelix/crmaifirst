import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COPILOT_SYSTEM_PROMPT = `Voce e o Copiloto de Marketing, um assistente inteligente especializado em gestao de trafego pago e marketing digital.

## Suas capacidades:
- **Criar campanhas** completas no Meta Ads (campanha + conjuntos + anuncios)
- **Gerar criativos** com IA (imagens para anuncios em diversos formatos e angulos)
- **Sincronizar dados** do Meta Ads com o sistema local
- **Pausar e ativar** campanhas, conjuntos de anuncios e anuncios
- **Analisar metricas** de desempenho (CPL, CPC, CTR, ROAS, etc.)
- **Fazer upload de imagens** para a biblioteca do Meta Ads
- **Otimizar campanhas** com sugestoes baseadas em dados

## Como voce funciona:
Quando o usuario pedir uma acao, voce deve retornar um bloco de acao no formato:
\`\`\`action
{
  "function": "nome-da-funcao",
  "params": { ... }
}
\`\`\`

## Funcoes disponiveis:
1. **meta-ads-sync** - Sincronizar dados do Meta
   Params: { "account_id": "uuid" }

2. **meta-ads-create** - Criar campanha completa
   Params: { "account_id": "uuid", "campaign": { "name": "...", "objective": "...", "daily_budget": 100, "adsets": [...] } }

3. **meta-ads-update** - Atualizar entidade (pausar, ativar, editar)
   Params: { "account_id": "uuid", "entity_type": "campaign|adset|ad", "meta_entity_id": "...", "updates": { "status": "PAUSED" } }

4. **meta-upload-image** - Upload de imagem para Meta
   Params: { "account_id": "uuid", "image_url": "https://..." }

5. **generate-creative** - Gerar criativo com IA
   Params: { "prompt": "...", "format": "1:1|9:16|4:5", "angle": "dor|oportunidade|resultado|curiosidade|autoridade" }

## Regras:
- Sempre responda em PT-BR informal e direto
- Quando sugerir acoes, inclua o bloco \`\`\`action\`\`\` para que o sistema possa executar
- Antes de criar campanhas, pergunte sobre: objetivo, publico, orcamento e criativo
- Sempre confirme acoes destrutivas (pausar, deletar) antes de executar
- Use emojis com moderacao para deixar a conversa amigavel
- Se nao tiver certeza, pergunte antes de agir
- Para analise de metricas, use dados reais do contexto fornecido
- Valores de budget sao sempre em reais (BRL)`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversation_id, user_id, execute_action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY nao esta configurada");
    }

    // ---- Modo de execucao de acao ----
    if (execute_action) {
      const { function: functionName, params } = execute_action;

      if (!functionName || !params) {
        throw new Error("execute_action requer 'function' e 'params'");
      }

      // Validar funcoes permitidas
      const allowedFunctions = [
        "meta-ads-sync",
        "meta-ads-create",
        "meta-ads-update",
        "meta-upload-image",
        "generate-creative",
      ];

      if (!allowedFunctions.includes(functionName)) {
        throw new Error(`Funcao nao permitida: ${functionName}`);
      }

      // Chamar a edge function correspondente
      const functionUrl = `${supabaseUrl}/functions/v1/${functionName}`;
      const actionRes = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(params),
      });

      const actionResult = await actionRes.json();

      return new Response(
        JSON.stringify({
          sucesso: actionRes.ok,
          funcao_executada: functionName,
          resultado: actionResult,
        }),
        {
          status: actionRes.ok ? 200 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ---- Modo de conversa ----
    if (!message) {
      throw new Error("message ou execute_action e obrigatorio");
    }

    // Buscar ou criar conversa
    let conversationMessages: any[] = [];
    let activeConversationId = conversation_id;

    if (activeConversationId) {
      const { data: existingConversation } = await supabase
        .from("marketing_copilot_conversations")
        .select("*")
        .eq("id", activeConversationId)
        .single();

      if (existingConversation) {
        conversationMessages = existingConversation.messages || [];
      }
    }

    // Buscar contexto das contas e campanhas do usuario
    let contextData: Record<string, any> = {};

    if (user_id) {
      // Buscar contas de marketing
      const { data: accounts } = await supabase
        .from("marketing_accounts")
        .select("id, account_id, account_name, platform, status, currency, last_synced_at")
        .eq("user_id", user_id)
        .eq("status", "active");

      contextData.contas = accounts || [];

      // Buscar campanhas ativas
      if (accounts && accounts.length > 0) {
        const accountIds = accounts.map((a: any) => a.id);
        const { data: campaigns } = await supabase
          .from("marketing_campaigns")
          .select("id, meta_campaign_id, name, objective, status, daily_budget, metrics")
          .in("account_id", accountIds)
          .order("created_at", { ascending: false })
          .limit(20);

        contextData.campanhas = campaigns || [];

        // Buscar metricas recentes dos adsets
        if (campaigns && campaigns.length > 0) {
          const campaignIds = campaigns.map((c: any) => c.id);
          const { data: adsets } = await supabase
            .from("marketing_adsets")
            .select("id, meta_adset_id, name, status, daily_budget, targeting, metrics, campaign_id")
            .in("campaign_id", campaignIds)
            .limit(50);

          contextData.conjuntos_de_anuncios = adsets || [];
        }
      }

      // Buscar criativos recentes
      const { data: creatives } = await supabase
        .from("marketing_creatives")
        .select("id, prompt, image_url, format, angle, headline, primary_text, used_in_ads, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      contextData.criativos_recentes = creatives || [];
    }

    // Montar contexto do usuario
    const contextString = Object.keys(contextData).length > 0
      ? `\n\n## Contexto atual do usuario:\n${JSON.stringify(contextData, null, 2)}`
      : "\n\nO usuario ainda nao tem contas de marketing configuradas.";

    // Montar mensagens para a IA
    const aiMessages = [
      { role: "system", content: COPILOT_SYSTEM_PROMPT + contextString },
    ];

    // Adicionar historico da conversa (ultimas 20 mensagens para nao exceder contexto)
    const recentMessages = conversationMessages.slice(-20);
    for (const msg of recentMessages) {
      aiMessages.push({ role: msg.role, content: msg.content });
    }

    // Adicionar mensagem atual
    aiMessages.push({ role: "user", content: message });

    // Chamar OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisicoes excedido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Creditos insuficientes. Adicione fundos." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Erro no AI gateway:", response.status, errorText);
      throw new Error(`Erro no AI gateway: ${response.status}`);
    }

    const aiData = await response.json();
    const assistantContent = aiData.choices?.[0]?.message?.content;

    if (!assistantContent) {
      throw new Error("Sem conteudo na resposta da IA");
    }

    // Extrair blocos de acao do response
    const actionBlocks: any[] = [];
    const actionRegex = /```action\s*\n([\s\S]*?)```/g;
    let match;
    while ((match = actionRegex.exec(assistantContent)) !== null) {
      try {
        const actionData = JSON.parse(match[1].trim());
        actionBlocks.push(actionData);
      } catch (e) {
        console.error("Erro ao parsear bloco de acao:", e);
      }
    }

    // Salvar conversa
    const newMessages = [
      ...conversationMessages,
      { role: "user", content: message, timestamp: new Date().toISOString() },
      { role: "assistant", content: assistantContent, timestamp: new Date().toISOString() },
    ];

    // Gerar titulo da conversa a partir da primeira mensagem
    const conversationTitle = conversationMessages.length === 0
      ? message.substring(0, 80)
      : undefined;

    if (activeConversationId) {
      // Atualizar conversa existente
      await supabase
        .from("marketing_copilot_conversations")
        .update({
          messages: newMessages,
          context: contextData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeConversationId);
    } else if (user_id) {
      // Criar nova conversa
      const { data: newConversation } = await supabase
        .from("marketing_copilot_conversations")
        .insert({
          user_id: user_id,
          title: conversationTitle || "Nova conversa",
          messages: newMessages,
          context: contextData,
          is_active: true,
        })
        .select("id")
        .single();

      if (newConversation) {
        activeConversationId = newConversation.id;
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        resposta: assistantContent,
        conversation_id: activeConversationId || null,
        acoes_detectadas: actionBlocks,
        tem_acoes: actionBlocks.length > 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("marketing-copilot error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
