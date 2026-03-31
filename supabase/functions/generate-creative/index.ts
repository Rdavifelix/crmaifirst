import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapeamento de formato para dimensoes
const FORMAT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "4:5": { width: 1080, height: 1350 },
  "16:9": { width: 1920, height: 1080 },
};

// Angulos de copy para enriquecer o prompt
const ANGLE_CONTEXT: Record<string, string> = {
  dor: "Foque na dor e frustacao do publico-alvo. Mostre o problema de forma visceral e emocional.",
  oportunidade: "Destaque a oportunidade unica e o timing perfeito. Crie urgencia e FOMO.",
  resultado: "Mostre resultados concretos, numeros e transformacao. Use provas sociais visuais.",
  curiosidade: "Crie intrigue e curiosidade. Use elementos misteriosos que gerem cliques.",
  autoridade: "Transmita credibilidade, expertise e autoridade. Use elementos profissionais e dados.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, format, angle, headline, primary_text, account_id } = await req.json();

    if (!prompt) {
      throw new Error("prompt e obrigatorio");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const OPENAI_API_KEY = await getIntegrationKeyWithClient(supabase, "openai", "api_key", "OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY nao esta configurada");
    }

    const selectedFormat = format || "1:1";
    const dimensions = FORMAT_DIMENSIONS[selectedFormat] || FORMAT_DIMENSIONS["1:1"];
    const angleContext = angle ? ANGLE_CONTEXT[angle] || "" : "";

    // ---- 1. Gerar imagem via OpenAI ----
    const imagePrompt = `Crie uma imagem profissional para anuncio digital (Meta Ads).
Formato: ${selectedFormat} (${dimensions.width}x${dimensions.height}px)
${angleContext ? `Angulo de copy: ${angleContext}` : ""}
${headline ? `Headline do anuncio: ${headline}` : ""}
${primary_text ? `Texto principal: ${primary_text}` : ""}

Instrucoes do usuario: ${prompt}

IMPORTANTE:
- A imagem deve ser visualmente impactante e profissional
- Use cores vibrantes e alto contraste
- Se incluir texto na imagem, use fontes grandes e legíveis
- Otimize para mobile (a maioria verra no celular)
- Nao use marcas d'agua ou logos genericos`;

    const systemPrompt = `Voce e um designer grafico especialista em criativos para Meta Ads.
Gere imagens de alta qualidade, profissionais, com foco em conversao e cliques.
Sempre gere a imagem no formato solicitado.`;

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
          { role: "user", content: imagePrompt },
        ],
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
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Sem conteudo na resposta da IA");
    }

    // Extrair imagem da resposta (pode vir como base64 inline ou URL)
    let imageUrl = "";
    let imageBase64 = "";
    let storagePath = "";

    // Tentar extrair URL de imagem do conteudo
    const urlMatch = content.match(/https?:\/\/[^\s"'<>]+\.(png|jpg|jpeg|webp)[^\s"'<>]*/i);
    if (urlMatch) {
      imageUrl = urlMatch[0];
    }

    // Tentar extrair base64 do conteudo
    const base64Match = content.match(/data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)/);
    if (base64Match) {
      imageBase64 = base64Match[2];
      const mimeType = base64Match[1];

      // Salvar no Supabase Storage
      const fileName = `creative_${Date.now()}.${mimeType === "jpeg" ? "jpg" : mimeType}`;
      storagePath = `creatives/${fileName}`;

      // Converter base64 para Uint8Array
      const binaryString = atob(imageBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from("marketing")
        .upload(storagePath, bytes, {
          contentType: `image/${mimeType}`,
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro ao salvar no Storage:", uploadError);
      } else {
        // Gerar URL publica
        const { data: publicUrlData } = supabase.storage
          .from("marketing")
          .getPublicUrl(storagePath);
        imageUrl = publicUrlData.publicUrl;
      }
    }

    // Se a IA retornou uma URL externa, baixar e salvar no Storage
    if (imageUrl && !storagePath) {
      try {
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const imgBlob = await imgRes.blob();
          const imgContentType = imgRes.headers.get("content-type") || "image/png";
          const ext = imgContentType.includes("jpeg") || imgContentType.includes("jpg") ? "jpg" : "png";
          const fileName = `creative_${Date.now()}.${ext}`;
          storagePath = `creatives/${fileName}`;

          const imgArrayBuffer = await imgBlob.arrayBuffer();
          const imgBytes = new Uint8Array(imgArrayBuffer);

          const { error: uploadError } = await supabase.storage
            .from("marketing")
            .upload(storagePath, imgBytes, {
              contentType: imgContentType,
              upsert: false,
            });

          if (uploadError) {
            console.error("Erro ao salvar imagem externa no Storage:", uploadError);
          } else {
            const { data: publicUrlData } = supabase.storage
              .from("marketing")
              .getPublicUrl(storagePath);
            imageUrl = publicUrlData.publicUrl;
          }
        }
      } catch (e) {
        console.error("Erro ao baixar imagem da URL:", e);
      }
    }

    // ---- 2. Salvar registro no marketing_creatives ----
    const creativeRecord: Record<string, any> = {
      prompt: prompt,
      image_url: imageUrl || null,
      storage_path: storagePath || null,
      format: selectedFormat,
      angle: angle || null,
      headline: headline || null,
      primary_text: primary_text || null,
    };

    if (account_id) {
      creativeRecord.account_id = account_id;
    }

    const { data: creative, error: insertError } = await supabase
      .from("marketing_creatives")
      .insert(creativeRecord)
      .select()
      .single();

    if (insertError) {
      console.error("Erro ao salvar creative:", insertError);
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Criativo gerado com sucesso",
        creative: creative || creativeRecord,
        image_url: imageUrl,
        storage_path: storagePath,
        ai_response: content,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("generate-creative error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
