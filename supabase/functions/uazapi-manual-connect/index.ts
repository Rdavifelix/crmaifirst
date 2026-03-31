import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

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
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const userToken = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(userToken);
    if (userError || !user) throw new Error('Invalid user token');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) throw new Error('Profile not found');

    const { url, instance_token } = await req.json();
    if (!url || !instance_token) throw new Error('URL e Token são obrigatórios');

    const baseUrl = url.replace(/\/+$/, '');
    const cleanToken = instance_token.trim().replace(/^Bearer\s+/i, '').replace(/^admintoken\s+/i, '');
    
    console.log('Attempting connection to:', baseUrl);
    console.log('Token (first 10 chars):', cleanToken.substring(0, 10));

    // Step 1: Use admin token to create/find instance for this user
    const instanceName = `seller_${profile.id.substring(0, 8)}`;
    
    // Try creating an instance (will return existing if name matches)
    console.log('Creating/finding instance:', instanceName);
    const createResponse = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'admintoken': cleanToken,
        'adminToken': cleanToken,
      },
      body: JSON.stringify({ name: instanceName }),
    });

    console.log('Create response status:', createResponse.status);
    const createText = await createResponse.text();
    console.log('Create response:', createText.substring(0, 500));

    let instanceData: any;
    try {
      instanceData = JSON.parse(createText);
    } catch {
      throw new Error(`Resposta inválida do servidor UAZAPI: ${createText.substring(0, 100)}`);
    }

    if (!createResponse.ok && createResponse.status !== 409) {
      throw new Error(`Erro UAZAPI: ${instanceData.message || createText.substring(0, 100)}`);
    }

    // Extract instance token
    const instToken = instanceData.token || instanceData.instance?.token;
    const instanceId = instanceData.instance?.id || instanceData.id || instanceName;

    if (!instToken) {
      // If instance already exists, try to get its status
      console.log('No token in create response, trying status check...');
      
      // Check if there's an existing instance in our DB
      const { data: existingInstance } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('owner_id', profile.id)
        .single();

      if (existingInstance?.token) {
        // Use existing token to check status
        const statusResp = await fetch(`${baseUrl}/instance/status`, {
          method: 'GET',
          headers: { 'token': existingInstance.token },
        });

        if (statusResp.ok) {
          const statusData = await statusResp.json();
          console.log('Existing instance status:', JSON.stringify(statusData));

          const uazapiStatus = statusData.status || {};
          const isConnected = uazapiStatus.connected === true || uazapiStatus.loggedIn === true;

          const phoneNumber = uazapiStatus.jid?.split(':')[0] || existingInstance.phone_number;

          await supabase.from('whatsapp_instances').update({
            status: isConnected ? 'connected' : 'disconnected',
            phone_number: phoneNumber,
            last_connected_at: isConnected ? new Date().toISOString() : existingInstance.last_connected_at,
          }).eq('id', existingInstance.id);

          // Configure webhook
          await configureWebhook(baseUrl, existingInstance.token, supabaseUrl);

          return new Response(
            JSON.stringify({
              success: true,
              connected: isConnected,
              status: isConnected ? 'connected' : 'disconnected',
              phone_number: phoneNumber,
              instance_id: existingInstance.instance_id,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      throw new Error('Não foi possível obter o token da instância. Verifique as credenciais.');
    }

    // Step 2: Check status with instance token
    console.log('Checking status with instance token...');
    const statusResponse = await fetch(`${baseUrl}/instance/status`, {
      method: 'GET',
      headers: { 'token': instToken },
    });

    let dbStatus = 'disconnected';
    let phoneNumber: string | null = null;

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('Status:', JSON.stringify(statusData));

      const uazapiStatus = statusData.status || {};
      const isConnected = uazapiStatus.connected === true || uazapiStatus.loggedIn === true;
      dbStatus = isConnected ? 'connected' : 'disconnected';
      phoneNumber = uazapiStatus.jid?.split(':')[0] || null;
    }

    // Step 3: Save to database
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('owner_id', profile.id)
      .single();

    const webhookSecret = crypto.randomUUID();
    const record = {
      owner_id: profile.id,
      instance_id: instanceId.toString(),
      token: instToken,
      status: dbStatus,
      phone_number: phoneNumber,
      webhook_secret: webhookSecret,
      last_connected_at: dbStatus === 'connected' ? new Date().toISOString() : null,
      uazapi_url: baseUrl,
    };

    if (existingInstance) {
      await supabase.from('whatsapp_instances').update(record).eq('id', existingInstance.id);
    } else {
      await supabase.from('whatsapp_instances').insert(record);
    }

    // Step 4: Configure webhook
    await configureWebhook(baseUrl, instToken, supabaseUrl);

    return new Response(
      JSON.stringify({
        success: true,
        connected: dbStatus === 'connected',
        status: dbStatus,
        phone_number: phoneNumber,
        instance_id: instanceId,
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

async function configureWebhook(baseUrl: string, instanceToken: string, supabaseUrl: string) {
  const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook-receiver`;
  console.log('Configuring webhook:', webhookUrl);

  const response = await fetch(`${baseUrl}/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'token': instanceToken,
    },
    body: JSON.stringify({
      enabled: true,
      url: webhookUrl,
      events: ['connection', 'messages', 'messages_update'],
      excludeMessages: ['wasSentByApi'],
    }),
  });

  if (!response.ok) {
    console.error('Webhook config error:', await response.text());
  } else {
    console.log('Webhook configured successfully');
  }
}
