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

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get user's profile and instance
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('owner_id', profile.id)
      .single();

    if (!instance) {
      return new Response(
        JSON.stringify({ 
          has_instance: false,
          status: 'none'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance.instance_id) {
      return new Response(
        JSON.stringify({ 
          has_instance: true,
          status: 'not_configured'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check status on UAZAPI - use instance token and URL from DB
    const instanceToken = instance.token;
    const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
    const uazapiUrl = instance.uazapi_url
      || normalizeUazapiUrl(uazapiSubdomain);

    const statusResponse = await fetch(
      `${uazapiUrl}/instance/status`,
      {
        method: 'GET',
        headers: {
          'token': instanceToken,
        },
      }
    );

    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('UAZAPI status error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          has_instance: true,
          status: instance.status,
          phone_number: instance.phone_number,
          error: 'Could not verify with UAZAPI'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const statusData = await statusResponse.json();
    console.log('UAZAPI status:', statusData);

    // Extract status from nested structure - UAZAPI returns { instance: {...}, status: { connected, loggedIn, jid } }
    const uazapiStatus = statusData.status || {};
    const instanceData = statusData.instance || statusData;
    
    // Map UAZAPI status to our status
    let dbStatus = 'disconnected';
    const isConnected = uazapiStatus.connected === true || 
                        uazapiStatus.loggedIn === true || 
                        instanceData.status === 'connected';
    
    if (isConnected) {
      dbStatus = 'connected';
    } else if (instanceData.status === 'connecting' || instanceData.status === 'qr') {
      dbStatus = 'connecting';
    } else if (instanceData.status === 'banned') {
      dbStatus = 'banned';
    }
    
    // Extract phone number from various possible locations
    const phoneNumber = uazapiStatus.jid?.split(':')[0] || 
                        instanceData.owner || 
                        statusData.phone || 
                        statusData.phoneNumber || 
                        instance.phone_number;

    // Update database if status changed
    if (dbStatus !== instance.status || (phoneNumber && phoneNumber !== instance.phone_number)) {
      await supabase
        .from('whatsapp_instances')
        .update({ 
          status: dbStatus,
          phone_number: phoneNumber,
          last_connected_at: dbStatus === 'connected' ? new Date().toISOString() : instance.last_connected_at
        })
        .eq('id', instance.id);
    }

    return new Response(
      JSON.stringify({ 
        has_instance: true,
        status: dbStatus,
        phone_number: phoneNumber,
        connected: dbStatus === 'connected'
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
