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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    const event =
      payload.event ||
      payload.type ||
      payload.EventType ||
      payload.eventType;

    const instanceToken = payload.token || payload.instanceToken || payload.instance?.token;
    const instanceRef =
      payload.instance ||
      payload.instanceId ||
      payload.instanceName ||
      payload.instance_id;

    // Debug logs: show payload structure, but redact secrets
    const redactedPayload = JSON.parse(
      JSON.stringify(payload, (key, value) => {
        const k = String(key).toLowerCase();
        if (k === 'token' || k === 'admintoken' || k === 'authorization') return '[REDACTED]';
        return value;
      })
    );

    console.log('Webhook received (summary):', {
      event,
      instanceRef,
      hasToken: Boolean(instanceToken),
    });
    console.log('Webhook payload keys:', Object.keys(payload ?? {}));
    if (payload?.message) console.log('Webhook payload.message keys:', Object.keys(payload.message));
    if (payload?.chat) console.log('Webhook payload.chat keys:', Object.keys(payload.chat));
    console.log('Webhook payload (sanitized):', JSON.stringify(redactedPayload, null, 2));

    if (!instanceToken && !instanceRef) {
      console.log('No instance identifier in payload');
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get instance from database (prefer token match)
    let instanceQuery = supabase.from('whatsapp_instances').select('*');
    instanceQuery = instanceToken
      ? instanceQuery.eq('token', instanceToken)
      : instanceQuery.eq('instance_id', instanceRef);

    const { data: instance, error: instanceError } = await instanceQuery.single();

    if (instanceError) {
      console.log('Instance lookup error:', instanceError.message);
    }

    if (!instance) {
      console.log('Instance not found:', {
        instanceRef,
        hasToken: Boolean(instanceToken),
      });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle different webhook events
    switch (event) {
      case 'connection':
      case 'connection.update':
      case 'status.instance': {
        const status = payload.status || payload.data?.status;
        const phone = payload.phone || payload.data?.phone || payload.data?.phoneNumber;

        let dbStatus = 'disconnected';
        if (status === 'open' || status === 'connected') {
          dbStatus = 'connected';
        } else if (status === 'connecting' || status === 'qr') {
          dbStatus = 'connecting';
        } else if (status === 'banned') {
          dbStatus = 'banned';
        }

        await supabase
          .from('whatsapp_instances')
          .update({
            status: dbStatus,
            phone_number: phone || instance.phone_number,
            last_connected_at:
              dbStatus === 'connected'
                ? new Date().toISOString()
                : instance.last_connected_at,
          })
          .eq('id', instance.id);

        console.log(
          `Instance ${instanceRef || instance.instance_id} status updated to ${dbStatus}`
        );
        break;
      }

      case 'qrcode.updated': {
        const qrcode = payload.qrcode || payload.data?.qrcode || payload.data?.base64;

        if (qrcode) {
          await supabase
            .from('whatsapp_instances')
            .update({
              status: 'connecting',
              qr_code_base64: qrcode,
            })
            .eq('id', instance.id);

          console.log(`Instance ${instanceRef || instance.instance_id} QR code updated`);
        }
        break;
      }

      case 'messages':
      case 'message':
      case 'messages.upsert': {
        // UAZAPI sends payload.message; other providers may send payload.data/payload.message
        const messageData = payload.message || payload.data || payload;

        const isFromMe = Boolean(
          messageData.fromMe ?? messageData.key?.fromMe ?? messageData.wasSentByApi
        );

        // Only process incoming messages
        if (isFromMe) {
          console.log('Ignoring outgoing message');
          break;
        }

        const remoteJid =
          messageData.key?.remoteJid ||
          messageData.chatid ||
          payload.chat?.wa_chatid ||
          messageData.sender_pn ||
          payload.chat?.phone ||
          messageData.from ||
          messageData.phone ||
          messageData.sender ||
          null;

        if (!remoteJid) {
          console.log('No remote JID found');
          break;
        }

        const rawPhone = String(remoteJid)
          .replace('@s.whatsapp.net', '')
          .replace('@c.us', '')
          .replace(/\D/g, '');

        // Build multiple candidates (Angola uses +244, handle optional country code)
        const candidates = new Set<string>();
        const addCandidate = (v?: string | null) => {
          if (!v) return;
          const digits = String(v).replace(/\D/g, '');
          if (digits.length >= 8) candidates.add(digits);
        };

        addCandidate(rawPhone);
        addCandidate(payload.chat?.phone);

        let noCountry = rawPhone;
        // Angola country code is 244
        if (noCountry.startsWith('244') && noCountry.length > 9) noCountry = noCountry.slice(3);
        addCandidate(noCountry);

        // Tail matches (cover stored formats)
        for (const n of [12, 11, 10, 9, 8]) {
          addCandidate(rawPhone.slice(-n));
        }

        const orFilter = Array.from(candidates)
          .map((c) => `phone.ilike.%${c}%`)
          .join(',');

        console.log('Lead lookup candidates:', Array.from(candidates));

        let { data: lead, error: leadError } = await supabase
          .from('leads')
          .select('id')
          .or(orFilter)
          .limit(1)
          .maybeSingle();

        if (leadError) {
          console.log('Lead lookup error:', leadError.message);
        }

        if (!lead) {
          console.log('Lead not found for phone (raw):', rawPhone, '- creating new lead');

          // Extract phone number from chatid/wa_chatid (the real phone)
          const phoneForDb = (messageData.chatid || payload.chat?.wa_chatid || remoteJid)
            ?.replace('@s.whatsapp.net', '')
            ?.replace('@c.us', '')
            ?.replace('@lid', '')
            ?.replace(/\D/g, '') || rawPhone;

          const contactName =
            messageData.senderName ||
            payload.chat?.wa_contactName ||
            payload.chat?.wa_name ||
            payload.chat?.name ||
            payload.chat?.lead_fullName ||
            payload.chat?.lead_name ||
            null;

          const { data: newLead, error: createError } = await supabase
            .from('leads')
            .insert({
              phone: phoneForDb,
              name: contactName || null,
              status: 'new',
              utm_source: 'whatsapp',
              avatar_url: payload.chat?.imagePreview || payload.chat?.image || null,
            })
            .select('id')
            .single();

          if (createError) {
            console.error('Error creating lead:', createError);
            break;
          }

          console.log('New lead created:', newLead.id, 'phone:', phoneForDb, 'name:', contactName);
          lead = newLead;
        }

        const messageContent =
          messageData.message?.conversation ||
          messageData.message?.extendedTextMessage?.text ||
          messageData.body ||
          messageData.text ||
          messageData.content ||
          '[Média recebida]';

        const mediaUrl =
          messageData.mediaUrl ||
          messageData.media_url ||
          messageData.message?.imageMessage?.url ||
          messageData.message?.videoMessage?.url ||
          messageData.message?.audioMessage?.url ||
          messageData.message?.documentMessage?.url ||
          null;

        const mediaType =
          messageData.mediaType ||
          messageData.media_type ||
          (messageData.type && messageData.type !== 'text' ? messageData.type : null) ||
          (messageData.message?.imageMessage
            ? 'image'
            : messageData.message?.videoMessage
              ? 'video'
              : messageData.message?.audioMessage
                ? 'audio'
                : messageData.message?.documentMessage
                  ? 'document'
                  : null);

        const { error: insertError } = await supabase.from('lead_messages').insert({
          lead_id: lead.id,
          sender_type: 'lead',
          message: messageContent,
          whatsapp_instance_id: instance.id,
          uazapi_message_id:
            messageData.key?.id || messageData.messageid || messageData.id || null,
          direction: 'incoming',
          message_status: 'delivered',
          media_url: mediaUrl,
          media_type: mediaType,
        });

        if (insertError) {
          console.error('Error saving message:', insertError);
        } else {
          console.log('Incoming message saved for lead:', lead.id);

          // Fire-and-forget: trigger AI agent processing (the DB trigger also does this,
          // but this is a backup in case pg_net is not available)
          try {
            const agentUrl = `${supabaseUrl}/functions/v1/ai-sales-agent`;
            fetch(agentUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ action: 'process_queue' }),
            }).catch((e) => console.warn('AI agent trigger failed (non-blocking):', e));
          } catch (e) {
            console.warn('AI agent fire-and-forget error:', e);
          }

          // Auto-welcome: send if enabled and this is the lead's first message
          if (instance.auto_welcome_enabled && instance.welcome_message) {
            const { count: previousMessages } = await supabase
              .from('lead_messages')
              .select('*', { count: 'exact', head: true })
              .eq('lead_id', lead.id)
              .eq('sender_type', 'lead');

            // Only send welcome on the very first message (count === 1 means just this one)
            if (previousMessages === 1) {
              console.log('Sending auto-welcome to lead:', lead.id);

              const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");
              const baseUrl = instance.uazapi_url
                || normalizeUazapiUrl(uazapiSubdomain);

              const welcomeResponse = await fetch(`${baseUrl}/send/text`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'token': instance.token || '',
                },
                body: JSON.stringify({
                  number: rawPhone,
                  text: instance.welcome_message,
                }),
              });

              const welcomeResult = await welcomeResponse.text();
              console.log('Welcome message response:', welcomeResult);

              let welcomeData;
              try { welcomeData = JSON.parse(welcomeResult); } catch { welcomeData = {}; }

              // Save welcome message to DB
              await supabase.from('lead_messages').insert({
                lead_id: lead.id,
                sender_type: 'attendant',
                message: instance.welcome_message,
                whatsapp_instance_id: instance.id,
                uazapi_message_id: welcomeData?.key?.id || welcomeData?.messageId || null,
                direction: 'outgoing',
                message_status: 'sent',
              });

              console.log('Auto-welcome message saved for lead:', lead.id);
            }
          }
        }
        break;
      }

      case 'messages_update':
      case 'message.ack': {
        const ackData = payload.data || payload.message || payload;
        const messageId =
          ackData.key?.id ||
          ackData.messageId ||
          ackData.messageid ||
          ackData.id;
        const ack = ackData.ack || ackData.status || ackData.message?.status;

        if (!messageId) break;

        // Map ack values: 1=sent, 2=delivered, 3=read
        let status = 'sent';
        if (ack === 2 || ack === 'DELIVERY_ACK') status = 'delivered';
        if (ack === 3 || ack === 'READ') status = 'read';

        await supabase
          .from('lead_messages')
          .update({ message_status: status })
          .eq('uazapi_message_id', messageId);

        console.log(`Message ${messageId} status updated to ${status}`);
        break;
      }

      default:
        console.log('Unhandled event type:', event);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
