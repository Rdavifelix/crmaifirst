import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const META_API_VERSION = "v21.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

type EntityType = "campaign" | "adset" | "ad";

const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  campaign: "marketing_campaigns",
  adset: "marketing_adsets",
  ad: "marketing_ads",
};

const ENTITY_META_ID_FIELD: Record<EntityType, string> = {
  campaign: "meta_campaign_id",
  adset: "meta_adset_id",
  ad: "meta_ad_id",
};

// Campos que o Meta recebe em centavos (budget)
const BUDGET_FIELDS = ["daily_budget", "lifetime_budget"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id, entity_type, meta_entity_id, updates } = await req.json();

    if (!account_id || !entity_type || !meta_entity_id || !updates) {
      throw new Error("account_id, entity_type, meta_entity_id e updates sao obrigatorios");
    }

    if (!["campaign", "adset", "ad"].includes(entity_type)) {
      throw new Error("entity_type deve ser 'campaign', 'adset' ou 'ad'");
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

    // ---- 1. Atualizar no Meta ----
    const metaPayload: Record<string, string> = {
      access_token: accessToken,
    };

    // Preparar payload para o Meta
    for (const [key, value] of Object.entries(updates)) {
      if (BUDGET_FIELDS.includes(key) && typeof value === "number") {
        // Converter budget de reais para centavos
        metaPayload[key] = String(Math.round((value as number) * 100));
      } else if (typeof value === "object" && value !== null) {
        metaPayload[key] = JSON.stringify(value);
      } else {
        metaPayload[key] = String(value);
      }
    }

    const metaRes = await fetch(`${META_BASE_URL}/${meta_entity_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(metaPayload).toString(),
    });

    if (!metaRes.ok) {
      const err = await metaRes.text();
      throw new Error(`Erro ao atualizar ${entity_type} no Meta: ${err}`);
    }

    const metaResult = await metaRes.json();
    console.log(`${entity_type} ${meta_entity_id} atualizado no Meta:`, metaResult);

    // ---- 2. Atualizar no banco local ----
    const tableName = ENTITY_TABLE_MAP[entity_type as EntityType];
    const metaIdField = ENTITY_META_ID_FIELD[entity_type as EntityType];

    // Montar objeto de update local (sem converter centavos, ja em reais)
    const localUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    // Mapear campos para o banco local
    for (const [key, value] of Object.entries(updates)) {
      // O banco armazena valores em reais, entao nao converter
      localUpdates[key] = value;
    }

    const { data: localEntity, error: updateError } = await supabase
      .from(tableName)
      .update(localUpdates)
      .eq(metaIdField, meta_entity_id)
      .select()
      .single();

    if (updateError) {
      console.error(`Erro ao atualizar ${entity_type} localmente:`, updateError);
      // Nao lanca erro pois ja atualizou no Meta
    }

    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: `${entity_type} atualizado com sucesso no Meta e localmente`,
        meta_response: metaResult,
        local_entity: localEntity || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("meta-ads-update error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
