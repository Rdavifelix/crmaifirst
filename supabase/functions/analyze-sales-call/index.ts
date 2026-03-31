import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptions, leadContext } = await req.json();

    if (!transcriptions || transcriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma transcrição fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = await getIntegrationKey("openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Format transcription for analysis
    const transcriptionText = transcriptions
      .map((t: any) => `${t.speaker}: ${t.text}`)
      .join("\n");

    const leadInfo = leadContext
      ? `\nCONTEXTO DO LEAD:\nNome: ${leadContext.name || "N/A"}\nTelefone: ${leadContext.phone || "N/A"}\nEmail: ${leadContext.email || "N/A"}\nStatus: ${leadContext.status || "N/A"}\nValor do deal: ${leadContext.deal_value || "N/A"}\n`
      : "";

    const systemPrompt = `És um analista de vendas especializado no mercado angolano. Analisa a transcrição da chamada e devolve uma análise estruturada.

REGRAS:
1. Responde SEMPRE em português de Angola (PT-AO)
2. Usa terminologia comercial angolana: "comercial" (não "vendedor"), "fecho" (não "fechamento"), "objecção" (não "objeção"), "contacto" (não "contato"), "telemóvel" (não "celular"), "equipa" (não "equipe")
3. Valores monetários em Kwanzas (Kz) quando aplicável
4. Referências a métodos de pagamento locais (Multicaixa, transferência bancária)
5. Sê objectivo e prático
6. Identifica pontos-chave da conversa
7. Avalia o sentimento geral
8. Sugere próximos passos concretos
9. Identifica riscos e oportunidades
10. Extrai dados relevantes (empresa, cargo, necessidade, orçamento, timeline, decisor)

Responde APENAS com o JSON no formato especificado, sem markdown.`;

    const userPrompt = `${leadInfo}
TRANSCRIÇÃO DA CHAMADA:
${transcriptionText}

Retorne a análise no seguinte formato JSON:
{
  "diagnostico": "Resumo de 2-3 frases sobre a chamada",
  "pontos_chave": ["ponto 1", "ponto 2", "ponto 3"],
  "riscos": ["risco 1", "risco 2"],
  "proximo_passo": "Ação concreta recomendada",
  "sentimento": "positive|neutral|negative",
  "tarefas_sugeridas": [
    {"titulo": "Tarefa 1", "prioridade": "high|medium|low", "descricao": "Descrição"},
    {"titulo": "Tarefa 2", "prioridade": "medium", "descricao": "Descrição"}
  ],
  "dados_extraidos": {
    "empresa": null,
    "cargo": null,
    "necessidade": null,
    "orcamento": null,
    "timeline": null,
    "decisor": null
  }
}`;

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
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para análise IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Erro ao chamar IA");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      analysis = JSON.parse(cleanContent);
    } catch {
      console.error("Failed to parse AI response:", content);
      analysis = {
        diagnostico: content.substring(0, 500),
        pontos_chave: [],
        riscos: [],
        proximo_passo: "Revisar manualmente",
        sentimento: "neutral",
        tarefas_sugeridas: [],
        dados_extraidos: {},
      };
    }

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
