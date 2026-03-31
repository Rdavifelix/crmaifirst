import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lead, messages, statusHistory, postSaleStages } = await req.json();

    const OPENAI_API_KEY = await getIntegrationKey("openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `És um especialista em análise de leads e CRM, com experiência no mercado angolano. Analisa os dados do lead fornecido e gera um relatório de saúde completo. Utiliza português angolano (ex: "telemóvel", "comercial", "equipa", "connosco", "utilizador") e a moeda local Kwanza (AOA/Kz).

Deves retornar um JSON válido com a seguinte estrutura:
{
  "healthScore": número de 0-100,
  "sentiment": "positive" | "neutral" | "negative",
  "sentimentLabel": "Positivo" | "Neutro" | "Negativo",
  "riskLevel": "low" | "medium" | "high",
  "riskLabel": "Baixo" | "Médio" | "Alto",
  "summary": "Resumo executivo de 2-3 frases sobre o lead",
  "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "attentionPoints": ["ponto de atenção 1", "ponto de atenção 2"],
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "engagementLevel": "high" | "medium" | "low",
  "engagementLabel": "Alto" | "Médio" | "Baixo",
  "predictedOutcome": "likely_win" | "uncertain" | "likely_loss",
  "predictedOutcomeLabel": "Provável Conversão" | "Incerto" | "Provável Perda",
  "nextBestAction": "Próxima melhor acção a tomar"
}

Analisa:
- Tempo desde criação
- Estado actual e histórico
- Valor do negócio (em Kwanzas - AOA)
- Origem do tráfego (UTM)
- Quantidade e tom das mensagens
- Velocidade de progressão no funil
- Estágios pós-venda (se houver)

IMPORTANTE: Todos os textos devem estar em português angolano. Use "acção" em vez de "ação", "contacto" em vez de "contato", "telemóvel" em vez de "celular", "comercial" em vez de "vendedor", "equipa" em vez de "equipe".`;

    const userPrompt = `Analisa este lead:

DADOS DO LEAD:
${JSON.stringify(lead, null, 2)}

HISTÓRICO DE MENSAGENS (${messages?.length || 0} mensagens):
${JSON.stringify(messages?.slice(-10) || [], null, 2)}

HISTÓRICO DE STATUS (${statusHistory?.length || 0} mudanças):
${JSON.stringify(statusHistory || [], null, 2)}

ESTÁGIOS PÓS-VENDA (${postSaleStages?.length || 0} estágios):
${JSON.stringify(postSaleStages || [], null, 2)}

Retorne APENAS o JSON, sem markdown ou explicações adicionais.`;

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
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanContent);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI analysis");
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("analyze-lead error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
