import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient, normalizeUazapiUrl } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const { candidate_id, message } = await req.json();
    if (!candidate_id) throw new Error("candidate_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const uazapiSubdomain = await getIntegrationKeyWithClient(supabase, "uazapi", "subdomain", "UAZAPI_SUBDOMAIN");

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) throw new Error("Invalid user token");

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!profile) throw new Error("Profile not found");

    // Get WhatsApp instance
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("owner_id", profile.id)
      .single();

    if (!instance?.instance_id || instance.status !== "connected") {
      throw new Error("WhatsApp não conectado. Conecte o WhatsApp nas Definições primeiro.");
    }

    // Get candidate
    const { data: candidate } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidate_id)
      .single();

    if (!candidate) throw new Error("Candidato não encontrado");
    if (!candidate.phone) throw new Error("Candidato não tem número de telefone cadastrado");

    // Format phone number
    let phoneNumber = candidate.phone.replace(/\D/g, "");
    if (!phoneNumber.startsWith("244") && phoneNumber.length <= 9) {
      phoneNumber = "244" + phoneNumber;
    }

    // Build message
    const finalMessage = message || buildDefaultMessage(candidate);

    console.log("Sending WhatsApp to candidate:", phoneNumber);

    if (!uazapiSubdomain) {
      throw new Error("UAZAPI não configurado");
    }

    // Send via UAZAPI
    const baseUrl = normalizeUazapiUrl(uazapiSubdomain);
    const sendResponse = await fetch(`${baseUrl}/send/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: instance.token || "",
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: finalMessage,
      }),
    });

    const responseText = await sendResponse.text();
    console.log("UAZAPI response:", sendResponse.status, responseText);

    if (!sendResponse.ok) {
      throw new Error(`Falha ao enviar mensagem: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Mensagem enviada com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildDefaultMessage(candidate: any): string {
  const name = candidate.name || "Candidato(a)";
  const position = candidate.position || "a vaga";
  const meetLink = candidate.meet_link;

  let msg = `Olá ${name}! 👋\n\n`;
  msg += `A sua entrevista para *${position}* foi agendada.\n\n`;

  if (meetLink) {
    msg += `📹 Link da entrevista:\n${meetLink}\n\n`;
  }

  msg += `Por favor, esteja disponível no horário combinado.\n`;
  msg += `Qualquer dúvida, estamos à disposição. Boa sorte! 🍀`;

  return msg;
}
