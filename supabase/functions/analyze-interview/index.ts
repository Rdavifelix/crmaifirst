import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, candidate_id } = await req.json();
    if (!session_id || !candidate_id) {
      return new Response(JSON.stringify({ error: "session_id and candidate_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Fetch session and candidate
    const { data: session } = await supabase.from("interview_sessions").select("*").eq("id", session_id).single();
    const { data: candidate } = await supabase.from("candidates").select("*").eq("id", candidate_id).single();

    if (!session || !candidate) throw new Error("Session or candidate not found");

    const transcriptions = session.transcriptions || [];
    const transcriptText = transcriptions
      .map((t: any) => `[${t.speaker}]: ${t.text}`)
      .join("\n");

    if (!transcriptText.trim()) {
      return new Response(JSON.stringify({ error: "No transcription content" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `És um especialista em recrutamento e selecção no mercado angolano. Analisa a transcrição da entrevista e avalia o candidato.
Responde SEMPRE em português de Angola (PT-AO). Usa terminologia angolana: "comercial" (não "vendedor"), "contacto" (não "contato"), "telemóvel" (não "celular"), "equipa" (não "equipe"), "formação" (não "graduação"), "habilitações" (não "formação acadêmica").
O candidato chama-se "${candidate.name || 'N/A'}" e está a concorrer à vaga de "${candidate.position || 'N/A'}".`,
          },
          {
            role: "user",
            content: `Analisa esta transcrição de entrevista:\n\n${transcriptText}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_candidate",
              description: "Avaliação completa do candidato em português de Angola",
              parameters: {
                type: "object",
                properties: {
                  nota_geral: { type: "number", description: "Nota geral 0-10" },
                  comunicacao: { type: "number", description: "Nota comunicação 0-10" },
                  conhecimento_tecnico: { type: "number", description: "Nota conhecimento técnico 0-10" },
                  postura_profissional: { type: "number", description: "Nota postura 0-10" },
                  adequacao_vaga: { type: "number", description: "Nota adequação à vaga 0-10" },
                  pontos_fortes: { type: "array", items: { type: "string" } },
                  pontos_fracos: { type: "array", items: { type: "string" } },
                  recomendacao: { type: "string", enum: ["Contratar", "Considerar", "Nao recomendado"] },
                  resumo: { type: "string", description: "Resumo de 3-4 frases" },
                  perguntas_nao_respondidas: { type: "array", items: { type: "string" } },
                },
                required: ["nota_geral", "comunicacao", "conhecimento_tecnico", "postura_profissional", "adequacao_vaga", "pontos_fortes", "pontos_fracos", "recomendacao", "resumo"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_candidate" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;

    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    }

    if (!analysis) throw new Error("Could not parse AI analysis");

    // Update session
    await supabase.from("interview_sessions").update({
      ai_analysis: analysis,
      ai_score: analysis.nota_geral,
      ai_sentiment: analysis.recomendacao,
    }).eq("id", session_id);

    // Update candidate
    await supabase.from("candidates").update({
      interview_score: analysis.nota_geral,
      interview_analysis: analysis,
    }).eq("id", candidate_id);

    return new Response(JSON.stringify({ analysis }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
