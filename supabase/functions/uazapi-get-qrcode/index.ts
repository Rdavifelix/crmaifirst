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
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error('Invalid user token');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!profile) throw new Error('Profile not found');

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('owner_id', profile.id)
      .single();

    if (!instance?.instance_id) {
      throw new Error('WhatsApp instance not found. Please create one first.');
    }

    const instanceToken = instance.token;
    if (!instanceToken) {
      throw new Error('WhatsApp instance token not found. Please recreate the instance.');
    }

    // Determine the UAZAPI base URL: prefer DB value, fallback to integration key
    const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
    const uazapiUrl = instance.uazapi_url
      || normalizeUazapiUrl(uazapiSubdomain);

    if (instance.status === 'connected') {
      return new Response(
        JSON.stringify({ connected: true, phone_number: instance.phone_number, status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling UAZAPI /instance/connect at:', uazapiUrl, 'with token:', instanceToken.substring(0, 8) + '...');

    const connectResponse = await fetch(`${uazapiUrl}/instance/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({}),
    });

    const connectData = await connectResponse.json();
    console.log('UAZAPI connect response:', JSON.stringify(connectData));

    if (connectData.connected === true || connectData.loggedIn === true) {
      const phoneNumber = connectData.jid || connectData.instance?.jid || instance.phone_number;
      await supabase.from('whatsapp_instances').update({
        status: 'connected',
        phone_number: phoneNumber,
        last_connected_at: new Date().toISOString(),
      }).eq('id', instance.id);

      return new Response(
        JSON.stringify({ connected: true, phone_number: phoneNumber, status: 'connected' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qrCodeBase64 =
      connectData.instance?.qrcode ||
      connectData.qrcode ||
      connectData.qr ||
      connectData.base64 ||
      connectData.qrCode ||
      null;

    if (!qrCodeBase64) {
      if (connectData.message?.includes('status') || connectData.error?.includes('Timeout')) {
        await supabase.from('whatsapp_instances').update({ status: 'connecting' }).eq('id', instance.id);
        throw new Error('QR code generation in progress. Please try again in a few seconds.');
      }
      throw new Error('QR code not returned by provider. Response: ' + JSON.stringify(connectData));
    }

    console.log('QR code retrieved successfully, length:', qrCodeBase64.length);

    await supabase.from('whatsapp_instances').update({
      status: 'connecting',
      qr_code_base64: qrCodeBase64,
    }).eq('id', instance.id);

    return new Response(
      JSON.stringify({ qrcode: qrCodeBase64, status: 'connecting', connected: false }),
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
