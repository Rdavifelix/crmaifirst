import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id, image_url, creative_id } = await req.json();

    if (!account_id || !image_url) {
      throw new Error("account_id e image_url sao obrigatorios");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar conta de marketing com access_token
    const { data: account, error: accountError } = await supabase
      .from("marketing_accounts")
      .select("*")
      .eq("id", account_id)
      .single();

    if (accountError || !account) {
      throw new Error(`Conta nao encontrada: ${accountError?.message || "ID invalido"}`);
    }

    const accessToken = account.access_token;
    const metaAccountId = account.account_id;

    // ---- 1. Baixar imagem da URL ----
    console.log(`Baixando imagem de: ${image_url}`);
    const imageRes = await fetch(image_url);
    if (!imageRes.ok) {
      throw new Error(`Erro ao baixar imagem: ${imageRes.status} ${imageRes.statusText}`);
    }

    const imageBlob = await imageRes.blob();
    const contentType = imageRes.headers.get("content-type") || "image/png";

    // Determinar extensao do arquivo
    let extension = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      extension = "jpg";
    } else if (contentType.includes("webp")) {
      extension = "webp";
    }

    const fileName = `ad_image_${Date.now()}.${extension}`;
    console.log(`Imagem baixada: ${fileName} (${imageBlob.size} bytes, ${contentType})`);

    // ---- 2. Upload para Meta Ad Account via multipart/form-data ----
    const formData = new FormData();
    formData.append("filename", new File([imageBlob], fileName, { type: contentType }));
    formData.append("access_token", accessToken);

    const uploadUrl = `${META_BASE_URL}/act_${metaAccountId}/adimages`;
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Erro ao fazer upload da imagem no Meta: ${err}`);
    }

    const uploadResult = await uploadRes.json();
    console.log("Upload Meta response:", JSON.stringify(uploadResult));

    // Extrair image_hash do resultado
    // A resposta do Meta vem no formato: { images: { "filename": { hash: "xxx", ... } } }
    let imageHash = "";
    let metaImageId = "";
    if (uploadResult.images) {
      const imageData = Object.values(uploadResult.images)[0] as any;
      imageHash = imageData?.hash || "";
      metaImageId = imageData?.id || "";
    }

    if (!imageHash) {
      throw new Error("Nao foi possivel extrair o image_hash da resposta do Meta");
    }

    console.log(`Imagem enviada para Meta. Hash: ${imageHash}`);

    // ---- 3. Atualizar marketing_creatives se creative_id fornecido ----
    if (creative_id) {
      const { error: updateError } = await supabase
        .from("marketing_creatives")
        .update({
          image_hash: imageHash,
          meta_image_id: metaImageId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creative_id);

      if (updateError) {
        console.error("Erro ao atualizar creative localmente:", updateError);
      } else {
        console.log(`Creative ${creative_id} atualizado com image_hash ${imageHash}`);
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Imagem enviada com sucesso para o Meta Ads",
        image_hash: imageHash,
        meta_image_id: metaImageId,
        file_name: fileName,
        file_size: imageBlob.size,
        creative_id: creative_id || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("meta-upload-image error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
