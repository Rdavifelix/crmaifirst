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
    const { account_id, campaign } = await req.json();

    if (!account_id || !campaign) {
      throw new Error("account_id e campaign sao obrigatorios");
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

    const resultados: {
      campanha: any;
      adsets: any[];
      ads: any[];
    } = { campanha: null, adsets: [], ads: [] };

    // ---- 1. Criar Campanha no Meta ----
    const campaignPayload: Record<string, string> = {
      name: campaign.name,
      objective: campaign.objective || "OUTCOME_LEADS",
      status: campaign.status || "PAUSED",
      special_ad_categories: JSON.stringify(campaign.special_ad_categories || []),
      access_token: accessToken,
    };

    if (campaign.daily_budget) {
      // Meta recebe budget em centavos
      campaignPayload.daily_budget = String(Math.round(campaign.daily_budget * 100));
    }
    if (campaign.lifetime_budget) {
      campaignPayload.lifetime_budget = String(Math.round(campaign.lifetime_budget * 100));
    }

    const campaignRes = await fetch(`${META_BASE_URL}/act_${metaAccountId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(campaignPayload).toString(),
    });

    if (!campaignRes.ok) {
      const err = await campaignRes.text();
      throw new Error(`Erro ao criar campanha no Meta: ${err}`);
    }

    const campaignResult = await campaignRes.json();
    const metaCampaignId = campaignResult.id;

    console.log(`Campanha criada no Meta: ${metaCampaignId}`);

    // Salvar campanha no banco local
    const { data: localCampaign, error: campError } = await supabase
      .from("marketing_campaigns")
      .insert({
        account_id: account_id,
        meta_campaign_id: metaCampaignId,
        name: campaign.name,
        objective: campaign.objective || "OUTCOME_LEADS",
        status: campaign.status || "PAUSED",
        daily_budget: campaign.daily_budget || null,
        lifetime_budget: campaign.lifetime_budget || null,
        special_ad_categories: campaign.special_ad_categories || [],
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (campError) {
      console.error("Erro ao salvar campanha localmente:", campError);
      throw new Error(`Campanha criada no Meta (${metaCampaignId}), mas falhou ao salvar localmente: ${campError.message}`);
    }

    resultados.campanha = { meta_id: metaCampaignId, local_id: localCampaign.id, name: campaign.name };

    // ---- 2. Criar AdSets ----
    const adsets = campaign.adsets || [];
    for (const adsetInput of adsets) {
      const adsetPayload: Record<string, string> = {
        campaign_id: metaCampaignId,
        name: adsetInput.name,
        status: adsetInput.status || "PAUSED",
        billing_event: adsetInput.billing_event || "IMPRESSIONS",
        optimization_goal: adsetInput.optimization_goal || "LEAD_GENERATION",
        targeting: JSON.stringify(adsetInput.targeting || {}),
        access_token: accessToken,
      };

      if (adsetInput.daily_budget) {
        adsetPayload.daily_budget = String(Math.round(adsetInput.daily_budget * 100));
      }
      if (adsetInput.lifetime_budget) {
        adsetPayload.lifetime_budget = String(Math.round(adsetInput.lifetime_budget * 100));
      }
      if (adsetInput.bid_strategy) {
        adsetPayload.bid_strategy = adsetInput.bid_strategy;
      }
      if (adsetInput.promoted_object) {
        adsetPayload.promoted_object = JSON.stringify(adsetInput.promoted_object);
      }
      if (adsetInput.start_time) {
        adsetPayload.start_time = adsetInput.start_time;
      }
      if (adsetInput.end_time) {
        adsetPayload.end_time = adsetInput.end_time;
      }

      const adsetRes = await fetch(`${META_BASE_URL}/act_${metaAccountId}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(adsetPayload).toString(),
      });

      if (!adsetRes.ok) {
        const err = await adsetRes.text();
        console.error(`Erro ao criar adset "${adsetInput.name}":`, err);
        resultados.adsets.push({ name: adsetInput.name, erro: err });
        continue;
      }

      const adsetResult = await adsetRes.json();
      const metaAdsetId = adsetResult.id;

      console.log(`AdSet criado no Meta: ${metaAdsetId}`);

      // Salvar adset no banco local
      const { data: localAdset, error: adsetError } = await supabase
        .from("marketing_adsets")
        .insert({
          campaign_id: localCampaign.id,
          meta_adset_id: metaAdsetId,
          name: adsetInput.name,
          status: adsetInput.status || "PAUSED",
          daily_budget: adsetInput.daily_budget || null,
          lifetime_budget: adsetInput.lifetime_budget || null,
          billing_event: adsetInput.billing_event || "IMPRESSIONS",
          optimization_goal: adsetInput.optimization_goal || "LEAD_GENERATION",
          bid_strategy: adsetInput.bid_strategy || "LOWEST_COST_WITHOUT_CAP",
          targeting: adsetInput.targeting || {},
          promoted_object: adsetInput.promoted_object || {},
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (adsetError) {
        console.error(`Erro ao salvar adset localmente:`, adsetError);
        resultados.adsets.push({ meta_id: metaAdsetId, name: adsetInput.name, erro_local: adsetError.message });
        continue;
      }

      resultados.adsets.push({ meta_id: metaAdsetId, local_id: localAdset.id, name: adsetInput.name });

      // ---- 3. Criar Ads dentro do AdSet ----
      const ads = adsetInput.ads || [];
      for (const adInput of ads) {
        // Primeiro, criar o criativo no Meta
        const creativePayload: Record<string, string> = {
          name: `Creative - ${adInput.name}`,
          access_token: accessToken,
        };

        if (adInput.creative) {
          // Se o creative tem object_story_spec (formato completo)
          if (adInput.creative.object_story_spec) {
            creativePayload.object_story_spec = JSON.stringify(adInput.creative.object_story_spec);
          }
          // Se tem url_tags
          if (adInput.creative.url_tags) {
            creativePayload.url_tags = adInput.creative.url_tags;
          }
          // Se tem asset_feed_spec (Advantage+ creative)
          if (adInput.creative.asset_feed_spec) {
            creativePayload.asset_feed_spec = JSON.stringify(adInput.creative.asset_feed_spec);
          }
        }

        const creativeRes = await fetch(`${META_BASE_URL}/act_${metaAccountId}/adcreatives`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(creativePayload).toString(),
        });

        if (!creativeRes.ok) {
          const err = await creativeRes.text();
          console.error(`Erro ao criar criativo para ad "${adInput.name}":`, err);
          resultados.ads.push({ name: adInput.name, adset: adsetInput.name, erro_creative: err });
          continue;
        }

        const creativeResult = await creativeRes.json();
        const metaCreativeId = creativeResult.id;

        // Agora criar o ad
        const adPayload: Record<string, string> = {
          name: adInput.name,
          adset_id: metaAdsetId,
          creative: JSON.stringify({ creative_id: metaCreativeId }),
          status: adInput.status || "PAUSED",
          access_token: accessToken,
        };

        if (adInput.tracking_specs) {
          adPayload.tracking_specs = JSON.stringify(adInput.tracking_specs);
        }

        const adRes = await fetch(`${META_BASE_URL}/act_${metaAccountId}/ads`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(adPayload).toString(),
        });

        if (!adRes.ok) {
          const err = await adRes.text();
          console.error(`Erro ao criar ad "${adInput.name}":`, err);
          resultados.ads.push({ name: adInput.name, adset: adsetInput.name, erro_ad: err });
          continue;
        }

        const adResult = await adRes.json();
        const metaAdId = adResult.id;

        console.log(`Ad criado no Meta: ${metaAdId}`);

        // Salvar ad no banco local
        const { error: adError } = await supabase
          .from("marketing_ads")
          .insert({
            adset_id: localAdset.id,
            meta_ad_id: metaAdId,
            name: adInput.name,
            status: adInput.status || "PAUSED",
            creative: { creative_id: metaCreativeId, ...adInput.creative },
            tracking_specs: adInput.tracking_specs || [],
            last_synced_at: new Date().toISOString(),
          });

        if (adError) {
          console.error(`Erro ao salvar ad localmente:`, adError);
        }

        resultados.ads.push({
          meta_id: metaAdId,
          creative_id: metaCreativeId,
          name: adInput.name,
          adset: adsetInput.name,
        });
      }
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: "Campanha criada com sucesso no Meta e salva localmente",
        resultados,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("meta-ads-create error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
