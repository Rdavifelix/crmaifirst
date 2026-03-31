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

    const rawAdminToken = await getIntegrationKeyWithClient(supabase, "uazapi", "admin_token", "UAZAPI_ADMIN_TOKEN");
    if (!rawAdminToken) {
      throw new Error("UAZAPI_ADMIN_TOKEN not configured");
    }
    const uazapiAdminToken = rawAdminToken
      .trim()
      .replace(/^Bearer\s+/i, '')
      .replace(/^admintoken\s+/i, '');

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    // Check if user already has an instance with uazapi_url
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_id, token, uazapi_url')
      .eq('owner_id', profile.id)
      .single();

    // Determine base URL from existing instance or integration key
    const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
    const uazapiBaseUrl = existingInstance?.uazapi_url
      || normalizeUazapiUrl(uazapiSubdomain);

    // If instance already exists and has a token, configure webhook and return
    if (existingInstance?.instance_id && existingInstance?.token) {
      await configureWebhook(uazapiBaseUrl, existingInstance.token, supabaseUrl, existingInstance.instance_id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Instance already exists, webhook configured',
          instance_id: existingInstance.instance_id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create instance on UAZAPI
    const instanceName = `seller_${profile.id.substring(0, 8)}`;
    
    console.log('Creating UAZAPI instance:', instanceName);
    
    const uazapiResponse = await fetch(`${uazapiBaseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'admintoken': uazapiAdminToken,
        'adminToken': uazapiAdminToken,
      },
      body: JSON.stringify({
        name: instanceName,
      }),
    });

    if (!uazapiResponse.ok) {
      const errorText = await uazapiResponse.text();
      console.error('UAZAPI create error:', errorText);
      throw new Error(`Failed to create UAZAPI instance: ${errorText}`);
    }

    const uazapiData = await uazapiResponse.json();
    console.log('UAZAPI instance created:', JSON.stringify(uazapiData, null, 2));

    // Extract instance ID and token
    const instanceId = uazapiData.instance?.id || uazapiData.id || instanceName;
    const instanceToken = uazapiData.token || uazapiData.instance?.token;

    if (!instanceToken) {
      console.error('No token in response:', uazapiData);
      throw new Error('No instance token received from UAZAPI');
    }

    // Generate webhook secret
    const webhookSecret = crypto.randomUUID();

    // Save or update instance in database
    const instanceData = {
      owner_id: profile.id,
      instance_id: instanceId,
      token: instanceToken,
      status: 'disconnected',
      webhook_secret: webhookSecret,
    };

    if (existingInstance) {
      await supabase
        .from('whatsapp_instances')
        .update(instanceData)
        .eq('id', existingInstance.id);
    } else {
      await supabase
        .from('whatsapp_instances')
        .insert(instanceData);
    }

    // Configure webhook using the instance token
    console.log('Configuring webhook for instance:', instanceId);
    await configureWebhook(uazapiBaseUrl, instanceToken, supabaseUrl, instanceId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance_id: instanceId,
        message: 'Instance created and webhook configured successfully'
      }),
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

async function configureWebhook(
  baseUrl: string, 
  instanceToken: string, 
  supabaseUrl: string,
  instanceId: string
): Promise<void> {
  const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook-receiver`;
  
  console.log('Configuring webhook:', { webhookUrl, instanceId });

  // Using simple mode (no action/id) as recommended in docs
  const webhookConfig = {
    enabled: true,
    url: webhookUrl,
    events: [
      'connection',
      'messages',
      'messages_update',
    ],
    // IMPORTANT: Exclude messages sent by API to avoid loops
    excludeMessages: ['wasSentByApi'],
  };

  console.log('Webhook config:', JSON.stringify(webhookConfig, null, 2));

  const response = await fetch(`${baseUrl}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': instanceToken,
    },
    body: JSON.stringify(webhookConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Webhook config error:', errorText);
    throw new Error(`Failed to configure webhook: ${errorText}`);
  }

  const result = await response.json();
  console.log('Webhook configured successfully:', JSON.stringify(result, null, 2));
}
