import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeUazapiUrl } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) throw new Error('Profile not found');

    // Get UAZAPI credentials
    const rawAdminToken = await getIntegrationKeyWithClient(supabase, "uazapi", "admin_token", "UAZAPI_ADMIN_TOKEN");
    if (!rawAdminToken) {
      throw new Error("UAZAPI admin token não configurado. Vá em Definições > Integrações.");
    }
    const adminToken = rawAdminToken.trim().replace(/^Bearer\s+/i, '').replace(/^admintoken\s+/i, '');

    const subdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
    if (!subdomain) {
      throw new Error("UAZAPI subdomain não configurado. Vá em Definições > Integrações.");
    }
    const baseUrl = normalizeUazapiUrl(subdomain);

    // Parse body for action
    let body: any = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { /* no body = list action */ }
    }

    const action = body.action || 'list';

    // ============ ACTION: LINK INSTANCE ============
    if (action === 'link_instance') {
      const { instance_id, instance_token, instance_name } = body;
      if (!instance_id || !instance_token) {
        throw new Error('instance_id e instance_token são obrigatórios');
      }

      // Check status of the instance
      let dbStatus = 'disconnected';
      let phoneNumber: string | null = null;

      try {
        const statusResp = await fetch(`${baseUrl}/instance/status`, {
          method: 'GET',
          headers: { 'token': instance_token },
        });
        if (statusResp.ok) {
          const statusData = await statusResp.json();
          console.log('Instance status:', JSON.stringify(statusData));
          const s = statusData.status || {};
          const isConnected = s.connected === true || s.loggedIn === true;
          dbStatus = isConnected ? 'connected' : 'disconnected';
          phoneNumber = s.jid?.split(':')[0] || statusData.owner || null;
        }
      } catch (e) {
        console.warn('Status check failed:', e);
      }

      // Upsert in whatsapp_instances
      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('owner_id', profile.id)
        .single();

      const webhookSecret = crypto.randomUUID();
      const record = {
        owner_id: profile.id,
        instance_id,
        token: instance_token,
        status: dbStatus,
        phone_number: phoneNumber,
        webhook_secret: webhookSecret,
        uazapi_url: baseUrl,
        last_connected_at: dbStatus === 'connected' ? new Date().toISOString() : null,
      };

      if (existing) {
        await supabase.from('whatsapp_instances').update(record).eq('id', existing.id);
      } else {
        await supabase.from('whatsapp_instances').insert(record);
      }

      // Configure webhook
      try {
        const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook-receiver`;
        await fetch(`${baseUrl}/webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instance_token,
          },
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['connection', 'messages', 'messages_update'],
            excludeMessages: ['wasSentByApi'],
          }),
        });
        console.log('Webhook configured for', instance_id);
      } catch (e) {
        console.warn('Webhook config failed:', e);
      }

      return new Response(
        JSON.stringify({
          success: true,
          connected: dbStatus === 'connected',
          status: dbStatus,
          phone_number: phoneNumber,
          instance_id,
          instance_name: instance_name || instance_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============ ACTION: LIST ============
    const response = await fetch(`${baseUrl}/instance/all`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'admintoken': adminToken,
        'adminToken': adminToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UAZAPI list instances error:', errorText);
      throw new Error(`Erro ao listar instâncias: ${response.status}`);
    }

    const instances = await response.json();

    // Get DB instances to show which are already linked
    const { data: dbInstances } = await supabase
      .from('whatsapp_instances')
      .select('instance_id, owner_id, status, phone_number');

    const dbMap = new Map(
      (dbInstances || []).map((i: any) => [i.instance_id, i])
    );

    const enriched = Array.isArray(instances) ? instances.map((inst: any) => {
      const instId = inst.id || inst.name;
      const dbEntry = dbMap.get(instId);
      return {
        ...inst,
        _db_linked: !!dbEntry,
        _db_status: dbEntry?.status || null,
        _db_phone: dbEntry?.phone_number || null,
        _db_owner_id: dbEntry?.owner_id || null,
      };
    }) : [];

    return new Response(
      JSON.stringify({ success: true, instances: enriched }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
