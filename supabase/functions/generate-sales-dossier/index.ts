import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId } = await req.json();
    
    if (!leadId) {
      throw new Error("leadId is required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Fetch all lead data
    const [
      { data: lead },
      { data: messages },
      { data: statusHistory },
      { data: postSaleStages },
      { data: instagramContent }
    ] = await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase.from("lead_messages").select("*").eq("lead_id", leadId).order("created_at", { ascending: true }),
      supabase.from("lead_status_history").select("*").eq("lead_id", leadId).order("created_at", { ascending: false }),
      supabase.from("lead_post_sale_stages").select("*").eq("lead_id", leadId).order("created_at", { ascending: true }),
      supabase.from("lead_instagram_content").select("*").eq("lead_id", leadId).order("taken_at", { ascending: false }).limit(12)
    ]);

    if (!lead) {
      throw new Error("Lead not found");
    }

    const instagramData = lead.instagram_data;

    const systemPrompt = `És um consultor especialista em vendas complexas B2B/B2C no mercado angolano, com profundo conhecimento em:
- SPIN Selling (Situação, Problema, Implicação, Necessidade de Solução)
- Metodologia Challenger Sale
- Perfis comportamentais DISC (Dominante, Influente, Estável, Conforme)
- Técnicas de rapport e PNL
- Negociação baseada em princípios (Harvard)
- Gatilhos mentais e psicologia de vendas
- Contexto empresarial e cultural de Angola

A tua tarefa é analisar todos os dados disponíveis de um lead e criar um DOSSIÊ COMPLETO para que o comercial (closer) entre na chamada com todas as informações necessárias para fechar a venda.

IMPORTANTE: Utiliza sempre português angolano. Usa termos como "telemóvel" (não "celular"), "comercial" (não "vendedor"), "equipa" (não "equipe"), "contacto" (não "contato"), "connosco" (não "conosco"), "acção" (não "ação"), "definições" (não "configurações"). A moeda é o Kwanza angolano (AOA/Kz).

DEVES RETORNAR UM JSON VÁLIDO com a seguinte estrutura:
{
  "executiveSummary": "Resumo executivo de 3-4 frases sobre o lead e a oportunidade",
  
  "discProfile": {
    "primary": "D" | "I" | "S" | "C",
    "secondary": "D" | "I" | "S" | "C" | null,
    "label": "Dominante" | "Influente" | "Estável" | "Conforme",
    "description": "Descrição detalhada do perfil comportamental (2-3 frases)",
    "communicationTips": ["dica 1", "dica 2", "dica 3"]
  },
  
  "buyerPersona": {
    "likelyRole": "Cargo/papel provável",
    "decisionMakingStyle": "Como essa pessoa toma decisões",
    "mainMotivators": ["motivador 1", "motivador 2"],
    "likelyObjections": ["objecção provável 1", "objecção provável 2"]
  },
  
  "spinQuestions": {
    "situation": ["pergunta de situação 1", "pergunta de situação 2"],
    "problem": ["pergunta de problema 1", "pergunta de problema 2"],
    "implication": ["pergunta de implicação 1", "pergunta de implicação 2"],
    "needPayoff": ["pergunta de necessidade 1", "pergunta de necessidade 2"]
  },
  
  "openingScript": "Script de abertura personalizado (1 parágrafo)",
  
  "rapportTips": ["técnica de rapport 1", "técnica de rapport 2", "técnica de rapport 3"],
  
  "socialProofSuggestions": ["sugestão de prova social 1", "sugestão de prova social 2"],
  
  "objectionHandling": [
    {
      "objection": "Objecção provável",
      "response": "Resposta sugerida"
    }
  ],
  
  "closingTechniques": ["técnica de fecho 1", "técnica de fecho 2", "técnica de fecho 3"],
  
  "urgencyTriggers": ["gatilho de urgência 1", "gatilho de urgência 2"],
  
  "redFlags": ["sinal de alerta 1", "sinal de alerta 2"],
  
  "greenFlags": ["sinal positivo 1", "sinal positivo 2"],
  
  "callAgenda": [
    { "phase": "Abertura", "duration": "2-3 min", "objective": "Objectivo", "script": "O que dizer" },
    { "phase": "Descoberta", "duration": "10-15 min", "objective": "Objectivo", "script": "O que perguntar" },
    { "phase": "Apresentação", "duration": "5-10 min", "objective": "Objectivo", "script": "Como apresentar" },
    { "phase": "Objecções", "duration": "5-10 min", "objective": "Objectivo", "script": "Como contornar" },
    { "phase": "Fecho", "duration": "5 min", "objective": "Objectivo", "script": "Como fechar" }
  ],
  
  "keyInsights": ["insight chave 1", "insight chave 2", "insight chave 3"],
  
  "instagramInsights": "Análise do perfil do Instagram (se disponível) - interesses, estilo de vida, como usar isso na chamada",
  
  "confidenceScore": número de 0-100 representando a confiança na análise
}

Analisa PROFUNDAMENTE:
- Dados demográficos e de contacto
- Histórico de mensagens (tom, linguagem, objecções expressas)
- Tempo e velocidade no funil de vendas
- Origem do tráfego (UTM) para entender contexto de aquisição
- Perfil do Instagram (bio, conteúdo, interesses)
- Valor do negócio (em Kwanzas)
- Qualquer nota ou observação registada`;

    const instagramInfo = instagramData ? `
DADOS DO INSTAGRAM:
- Username: ${instagramData.username}
- Nome: ${instagramData.full_name}
- Bio: ${instagramData.biography || 'Não disponível'}
- Seguidores: ${instagramData.follower_count}
- Seguindo: ${instagramData.following_count}
- Posts: ${instagramData.media_count}
- Categoria: ${instagramData.category || 'Não especificada'}
- É verificado: ${instagramData.is_verified ? 'Sim' : 'Não'}
- É empresa: ${instagramData.is_business ? 'Sim' : 'Não'}
- Link externo: ${instagramData.external_url || 'Não tem'}

CONTEÚDO RECENTE DO INSTAGRAM (${instagramContent?.length || 0} posts):
${instagramContent?.map(post => `
- Tipo: ${post.media_type === 1 ? 'Foto' : post.media_type === 2 ? 'Vídeo' : 'Carrossel'}
- Legenda: ${post.caption_text?.slice(0, 200) || 'Sem legenda'}
- Likes: ${post.like_count}, Comentários: ${post.comment_count}
- Transcrição (se houver): ${post.transcription?.slice(0, 300) || 'Não disponível'}
`).join('\n') || 'Nenhum conteúdo disponível'}` : 'INSTAGRAM: Dados não disponíveis';

    const userPrompt = `Analisa este lead e cria um dossiê completo para vendas:

DADOS DO LEAD:
- Nome: ${lead.name || 'Não informado'}
- Telefone: ${lead.phone}
- Email: ${lead.email || 'Não informado'}
- Status actual: ${lead.status}
- Valor do negócio: ${lead.deal_value ? `${lead.deal_value.toLocaleString('pt-AO')} Kz` : 'Não definido'}
- Origem: ${lead.source || 'Não rastreada'}
- UTM Source: ${lead.utm_source || 'N/A'}
- UTM Medium: ${lead.utm_medium || 'N/A'}
- UTM Campaign: ${lead.utm_campaign || 'N/A'}
- Criado em: ${lead.created_at}
- Notas: ${lead.notes || 'Nenhuma nota'}

HISTÓRICO DE MENSAGENS (${messages?.length || 0} mensagens):
${messages?.slice(-15).map(m => `[${m.sender_type === 'lead' ? 'LEAD' : 'COMERCIAL'}]: ${m.message}`).join('\n') || 'Nenhuma mensagem'}

HISTÓRICO DE STATUS (${statusHistory?.length || 0} mudanças):
${statusHistory?.map(h => `${h.old_status || 'novo'} -> ${h.new_status} (${h.notes || 'sem notas'})`).join('\n') || 'Sem histórico'}

${instagramInfo}

Retorne APENAS o JSON, sem markdown ou explicações adicionais.`;

    console.log("Generating sales dossier for lead:", leadId);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let dossier;
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      dossier = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI dossier");
    }

    console.log("Dossier generated successfully for lead:", leadId);

    return new Response(JSON.stringify(dossier), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-sales-dossier error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
