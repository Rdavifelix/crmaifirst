import { getIntegrationKey } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      phase,
      checklist_state,
      segments,
      lead_context,
      playbook_context,
      total_phases,
      current_phase_index,
    } = await req.json();

    if (!phase || !segments?.length) {
      return new Response(
        JSON.stringify({ checklist_updates: [], alert: null, suggestion: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transcript = segments
      .map((t: any) => `[${t.speakerType === 'local' ? 'Comercial' : 'Cliente'}] ${t.text}`)
      .join("\n");

    const checklistStr = phase.checklist
      .map((label: string, i: number) => `${i}. [${checklist_state[i] ? "✓" : " "}] ${label}`)
      .join("\n");

    const forbiddenStr = phase.forbidden_topics?.length
      ? phase.forbidden_topics.map((ft: string) => `- ${ft}`).join("\n")
      : "Nenhum";

    const systemPrompt = `Você é um Sales Coach em tempo real para o mercado angolano. Analise o trecho mais recente da conversa e actualize o estado do checklist e detecte problemas. Seja extremamente conciso — o comercial está numa chamada ao vivo. Use português angolano (ex: "comercial" em vez de "vendedor", "contacto" em vez de "contato", "fecho" em vez de "fechamento").

FASE: "${phase.name}" (${current_phase_index + 1}/${total_phases})
${phase.tips ? `DICA: ${phase.tips}` : ""}
${playbook_context ? `CONTEXTO: ${playbook_context}` : ""}
${lead_context?.name ? `LEAD: ${lead_context.name}` : ""}

CHECKLIST:
${checklistStr}

TÓPICOS PROIBIDOS:
${forbiddenStr}`;

    const OPENAI_API_KEY = await getIntegrationKey("openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

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
          { role: "user", content: transcript },
        ],
        temperature: 0.2,
        tools: [
          {
            type: "function",
            function: {
              name: "update_coach_state",
              description: "Update the sales coach checklist, alerts and suggestions based on the conversation segment.",
              parameters: {
                type: "object",
                properties: {
                  checklist_updates: {
                    type: "array",
                    description: "Checklist items whose completion status changed. Only include items that SHOULD change.",
                    items: {
                      type: "object",
                      properties: {
                        index: { type: "number", description: "Checklist item index (0-based)" },
                        completed: { type: "boolean" },
                      },
                      required: ["index", "completed"],
                      additionalProperties: false,
                    },
                  },
                  alert: {
                    type: "object",
                    description: "A critical alert if the seller violated a forbidden topic or made a serious mistake. Null if no issue.",
                    properties: {
                      message: { type: "string", description: "Mensagem curta de alerta para o comercial, em português angolano" },
                      severity: { type: "string", enum: ["warning", "critical"], description: "critical = violação de tópico proibido, warning = problema menor" },
                    },
                    required: ["message", "severity"],
                    additionalProperties: false,
                  },
                  suggestion: {
                    type: "string",
                    description: "Sugestão curta e accionável sobre o que o comercial deve fazer a seguir, em português angolano. Null se nada relevante.",
                  },
                },
                required: ["checklist_updates"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "update_coach_state" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("[sales-coach-analyze] AI error:", response.status, errText);
      return new Response(
        JSON.stringify({ checklist_updates: [], alert: null, suggestion: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    let result = { checklist_updates: [], alert: null, suggestion: null };
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("[sales-coach-analyze] Failed to parse tool call args:", toolCall.function.arguments);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[sales-coach-analyze] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
