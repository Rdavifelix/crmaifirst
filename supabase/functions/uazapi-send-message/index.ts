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

    const { lead_id, message, media_url, media_type } = await req.json();
    
    if (!lead_id || !message) {
      throw new Error('lead_id and message are required');
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

    if (!instance?.instance_id || instance.status !== 'connected') {
      throw new Error('WhatsApp not connected. Please scan QR code first.');
    }

    // Get lead phone number
    const { data: lead } = await supabase
      .from('leads')
      .select('phone, name')
      .eq('id', lead_id)
      .single();

    if (!lead?.phone) {
      throw new Error('Lead phone number not found');
    }

    // Format phone number (remove non-digits, add Angola country code if needed)
    let phoneNumber = lead.phone.replace(/\D/g, '');
    if (!phoneNumber.startsWith('244') && phoneNumber.length <= 9) {
      phoneNumber = '244' + phoneNumber;
    }
    // Use chatid format for UAZAPI
    const chatId = phoneNumber + '@s.whatsapp.net';

    console.log('Sending message to chatId:', chatId);
    console.log('Using instance:', instance.instance_id);

    // Use uazapi_url from DB, fallback to integration key
    const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
    const baseUrl = instance.uazapi_url
      || normalizeUazapiUrl(uazapiSubdomain);

    console.log('Using baseUrl:', baseUrl);
    
    let uazapiEndpoint: string;
    let messageBody: Record<string, unknown>;

    if (media_url && media_type) {
      // Media message - use /send/media endpoint
      uazapiEndpoint = `${baseUrl}/send/media`;
      
      let mediaTypeName: string;
      if (media_type.startsWith('image')) {
        mediaTypeName = 'image';
      } else if (media_type.startsWith('audio')) {
        mediaTypeName = 'audio';
      } else if (media_type.startsWith('video')) {
        mediaTypeName = 'video';
      } else {
        mediaTypeName = 'document';
      }
      
      messageBody = {
        number: phoneNumber,
        type: mediaTypeName,
        file: media_url,
        text: message || undefined,
      };
      
      // Remove undefined text field
      if (!messageBody.text) {
        delete messageBody.text;
      }
    } else {
      // Text message - use /send/text endpoint
      uazapiEndpoint = `${baseUrl}/send/text`;
      messageBody = {
        number: phoneNumber,
        text: message,
      };
    }

    console.log('Calling UAZAPI endpoint:', uazapiEndpoint);
    console.log('Message body:', JSON.stringify(messageBody));

    const sendResponse = await fetch(uazapiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instance.token || '',
      },
      body: JSON.stringify(messageBody),
    });

    const responseText = await sendResponse.text();
    console.log('UAZAPI response status:', sendResponse.status);
    console.log('UAZAPI response:', responseText);

    if (!sendResponse.ok) {
      console.error('UAZAPI send error:', responseText);
      throw new Error(`Failed to send message: ${responseText}`);
    }

    let sendData;
    try {
      sendData = JSON.parse(responseText);
    } catch {
      sendData = { raw: responseText };
    }

    console.log('Message sent successfully:', sendData);

    // Extract message ID from response
    const uazapiMessageId = sendData?.key?.id || 
                            sendData?.messageId || 
                            sendData?.id ||
                            sendData?.message?.key?.id;

    // Save message to database - use 'attendant' as per constraint
    const { data: savedMessage, error: saveError } = await supabase
      .from('lead_messages')
      .insert({
        lead_id,
        sender_id: user.id,
        sender_type: 'attendant',
        message,
        whatsapp_instance_id: instance.id,
        uazapi_message_id: uazapiMessageId,
        direction: 'outgoing',
        message_status: 'sent',
        media_url: media_url || null,
        media_type: media_type || null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving message:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: savedMessage?.id,
        uazapi_message_id: uazapiMessageId
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
