import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Retrieves an integration key from the database, falling back to env var.
 * Uses service_role to bypass RLS since edge functions run server-side.
 */
export async function getIntegrationKey(
  service: string,
  keyName: string,
  envFallback?: string
): Promise<string | undefined> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return envFallback ? Deno.env.get(envFallback) : undefined;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("integration_keys")
      .select("key_value")
      .eq("service", service)
      .eq("key_name", keyName)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.key_value) {
      return data.key_value;
    }
  } catch (e) {
    console.warn(`Failed to fetch integration key ${service}/${keyName} from DB:`, e);
  }

  return envFallback ? Deno.env.get(envFallback) : undefined;
}

/**
 * Same as getIntegrationKey but uses an existing Supabase client (avoids creating a new one).
 */
export async function getIntegrationKeyWithClient(
  supabase: SupabaseClient,
  service: string,
  keyName: string,
  envFallback?: string
): Promise<string | undefined> {
  try {
    const { data } = await supabase
      .from("integration_keys")
      .select("key_value")
      .eq("service", service)
      .eq("key_name", keyName)
      .eq("is_active", true)
      .maybeSingle();

    if (data?.key_value) {
      return data.key_value;
    }
  } catch (e) {
    console.warn(`Failed to fetch integration key ${service}/${keyName} from DB:`, e);
  }

  return envFallback ? Deno.env.get(envFallback) : undefined;
}

/**
 * Normalizes UAZAPI subdomain/URL input to a proper base URL.
 * Handles: "ianapratica", "ianapratica.uazapi.com", "https://ianapratica.uazapi.com", etc.
 */
export function normalizeUazapiUrl(input: string): string {
  let val = input.trim();
  if (val.startsWith('http://') || val.startsWith('https://')) {
    return val.replace(/\/+$/, '');
  }
  if (val.includes('.uazapi.com')) {
    return `https://${val.replace(/\/+$/, '')}`;
  }
  return `https://${val}.uazapi.com`;
}
