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
    const { token, photo_url } = await req.json();
    if (!token || !photo_url) {
      return new Response(JSON.stringify({ error: "token and photo_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    // Call OpenAI Vision
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
            content: `És um especialista em análise de documentos. Analisa a foto enviada e devolve APENAS um JSON com os campos:
- nome_legivel (boolean): o nome está legível?
- nome_extraido (string): qual nome aparece na foto
- assinatura_presente (boolean): há uma assinatura?
- assinatura_autentica (boolean): a assinatura parece autêntica/natural?
- qualidade_imagem (string): "boa", "media" ou "fraca"
- confianca (number 0-100): confiança geral na validação
- observacoes (string): observações adicionais`,
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analisa esta foto de nome e assinatura de um candidato a emprego:" },
              { type: "image_url", image_url: { url: photo_url } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_signature",
              description: "Devolve análise da foto de nome e assinatura",
              parameters: {
                type: "object",
                properties: {
                  nome_legivel: { type: "boolean" },
                  nome_extraido: { type: "string" },
                  assinatura_presente: { type: "boolean" },
                  assinatura_autentica: { type: "boolean" },
                  qualidade_imagem: { type: "string", enum: ["boa", "media", "fraca"] },
                  confianca: { type: "number" },
                  observacoes: { type: "string" },
                },
                required: ["nome_legivel", "nome_extraido", "assinatura_presente", "assinatura_autentica", "qualidade_imagem", "confianca", "observacoes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_signature" } },
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
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;

    if (toolCall) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content
      const content = aiData.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { confianca: 0, observacoes: "Análise falhou" };
    }

    const signatureStatus = analysis.confianca >= 50 && analysis.assinatura_presente ? "approved" : "rejected";

    // Update candidate
    await supabase
      .from("candidates")
      .update({
        signature_analysis: analysis,
        signature_status: signatureStatus,
        name: analysis.nome_extraido || undefined,
      })
      .eq("token", token);

    return new Response(JSON.stringify({ analysis, status: signatureStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
