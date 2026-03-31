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
    const { account_id, date_preset } = await req.json();

    if (!account_id) {
      throw new Error("account_id e obrigatorio");
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
    const datePreset = date_preset || "last_30d";

    // ---- 1. Sincronizar Campanhas ----
    const campaignsUrl = `${META_BASE_URL}/act_${metaAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,special_ad_categories,buying_type,start_time,stop_time&limit=500&access_token=${accessToken}`;
    const campaignsRes = await fetch(campaignsUrl);
    if (!campaignsRes.ok) {
      const err = await campaignsRes.text();
      throw new Error(`Erro ao buscar campanhas do Meta: ${err}`);
    }
    const campaignsData = await campaignsRes.json();
    const campaigns = campaignsData.data || [];

    console.log(`Sincronizando ${campaigns.length} campanhas...`);

    for (const camp of campaigns) {
      // Buscar insights da campanha
      let metrics = {};
      try {
        const insightsUrl = `${META_BASE_URL}/${camp.id}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type&date_preset=${datePreset}&access_token=${accessToken}`;
        const insightsRes = await fetch(insightsUrl);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          metrics = insightsData.data?.[0] || {};
        }
      } catch (e) {
        console.error(`Erro ao buscar insights da campanha ${camp.id}:`, e);
      }

      const { error: upsertError } = await supabase
        .from("marketing_campaigns")
        .upsert(
          {
            account_id: account_id,
            meta_campaign_id: camp.id,
            name: camp.name,
            objective: camp.objective,
            status: camp.status || "PAUSED",
            daily_budget: camp.daily_budget ? parseFloat(camp.daily_budget) / 100 : null,
            lifetime_budget: camp.lifetime_budget ? parseFloat(camp.lifetime_budget) / 100 : null,
            special_ad_categories: camp.special_ad_categories || [],
            buying_type: camp.buying_type || "AUCTION",
            metrics: metrics,
            start_time: camp.start_time || null,
            stop_time: camp.stop_time || null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "meta_campaign_id" }
        );

      if (upsertError) {
        console.error(`Erro ao salvar campanha ${camp.id}:`, upsertError);
      }
    }

    // ---- 2. Sincronizar AdSets ----
    const adsetsUrl = `${META_BASE_URL}/act_${metaAccountId}/adsets?fields=id,name,campaign_id,status,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_strategy,targeting,promoted_object,start_time,stop_time&limit=500&access_token=${accessToken}`;
    const adsetsRes = await fetch(adsetsUrl);
    if (!adsetsRes.ok) {
      const err = await adsetsRes.text();
      throw new Error(`Erro ao buscar adsets do Meta: ${err}`);
    }
    const adsetsData = await adsetsRes.json();
    const adsets = adsetsData.data || [];

    console.log(`Sincronizando ${adsets.length} adsets...`);

    for (const adset of adsets) {
      // Buscar campanha local pelo meta_campaign_id
      const { data: localCampaign } = await supabase
        .from("marketing_campaigns")
        .select("id")
        .eq("meta_campaign_id", adset.campaign_id)
        .single();

      if (!localCampaign) {
        console.error(`Campanha local nao encontrada para meta_campaign_id ${adset.campaign_id}`);
        continue;
      }

      // Buscar insights do adset
      let metrics = {};
      try {
        const insightsUrl = `${META_BASE_URL}/${adset.id}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type&date_preset=${datePreset}&access_token=${accessToken}`;
        const insightsRes = await fetch(insightsUrl);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          metrics = insightsData.data?.[0] || {};
        }
      } catch (e) {
        console.error(`Erro ao buscar insights do adset ${adset.id}:`, e);
      }

      const { error: upsertError } = await supabase
        .from("marketing_adsets")
        .upsert(
          {
            campaign_id: localCampaign.id,
            meta_adset_id: adset.id,
            name: adset.name,
            status: adset.status || "PAUSED",
            daily_budget: adset.daily_budget ? parseFloat(adset.daily_budget) / 100 : null,
            lifetime_budget: adset.lifetime_budget ? parseFloat(adset.lifetime_budget) / 100 : null,
            billing_event: adset.billing_event || "IMPRESSIONS",
            optimization_goal: adset.optimization_goal || "LEAD_GENERATION",
            bid_strategy: adset.bid_strategy || "LOWEST_COST_WITHOUT_CAP",
            targeting: adset.targeting || {},
            promoted_object: adset.promoted_object || {},
            metrics: metrics,
            start_time: adset.start_time || null,
            stop_time: adset.stop_time || null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "meta_adset_id" }
        );

      if (upsertError) {
        console.error(`Erro ao salvar adset ${adset.id}:`, upsertError);
      }
    }

    // ---- 3. Sincronizar Ads ----
    const adsUrl = `${META_BASE_URL}/act_${metaAccountId}/ads?fields=id,name,adset_id,status,creative{id,name,title,body,image_url,image_hash,thumbnail_url,link_url,call_to_action_type},tracking_specs&limit=500&access_token=${accessToken}`;
    const adsRes = await fetch(adsUrl);
    if (!adsRes.ok) {
      const err = await adsRes.text();
      throw new Error(`Erro ao buscar ads do Meta: ${err}`);
    }
    const adsData = await adsRes.json();
    const ads = adsData.data || [];

    console.log(`Sincronizando ${ads.length} ads...`);

    for (const ad of ads) {
      // Buscar adset local pelo meta_adset_id
      const { data: localAdset } = await supabase
        .from("marketing_adsets")
        .select("id")
        .eq("meta_adset_id", ad.adset_id)
        .single();

      if (!localAdset) {
        console.error(`Adset local nao encontrado para meta_adset_id ${ad.adset_id}`);
        continue;
      }

      // Buscar insights do ad
      let metrics = {};
      try {
        const insightsUrl = `${META_BASE_URL}/${ad.id}/insights?fields=impressions,clicks,spend,cpc,cpm,ctr,reach,frequency,actions,cost_per_action_type&date_preset=${datePreset}&access_token=${accessToken}`;
        const insightsRes = await fetch(insightsUrl);
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          metrics = insightsData.data?.[0] || {};
        }
      } catch (e) {
        console.error(`Erro ao buscar insights do ad ${ad.id}:`, e);
      }

      const { error: upsertError } = await supabase
        .from("marketing_ads")
        .upsert(
          {
            adset_id: localAdset.id,
            meta_ad_id: ad.id,
            name: ad.name,
            status: ad.status || "PAUSED",
            creative: ad.creative || {},
            tracking_specs: ad.tracking_specs || [],
            metrics: metrics,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: "meta_ad_id" }
        );

      if (upsertError) {
        console.error(`Erro ao salvar ad ${ad.id}:`, upsertError);
      }
    }

    // ---- 4. Atualizar last_synced_at da conta ----
    await supabase
      .from("marketing_accounts")
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", account_id);

    const resultado = {
      sucesso: true,
      mensagem: "Sincronizacao concluida com sucesso",
      resumo: {
        campanhas_sincronizadas: campaigns.length,
        adsets_sincronizados: adsets.length,
        ads_sincronizados: ads.length,
        date_preset: datePreset,
      },
    };

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("meta-ads-sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
