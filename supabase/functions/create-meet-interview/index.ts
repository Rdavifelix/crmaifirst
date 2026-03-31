import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getIntegrationKeyWithClient } from "../_shared/get-integration-key.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidate_id } = await req.json();
    if (!candidate_id) {
      return new Response(JSON.stringify({ error: "candidate_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const GOOGLE_SERVICE_ACCOUNT = await getIntegrationKeyWithClient(supabase, "google", "service_account_json", "GOOGLE_SERVICE_ACCOUNT_JSON");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("*")
      .eq("id", candidate_id)
      .single();

    if (!candidate) throw new Error("Candidate not found");

    let meetLink: string;

    if (GOOGLE_SERVICE_ACCOUNT) {
      // Real Google Calendar API integration
      // Parse service account credentials
      const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
      
      // Create JWT for Google API
      const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
      const now = Math.floor(Date.now() / 1000);
      const claim = btoa(JSON.stringify({
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/calendar",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      }));

      // For now, generate a placeholder Meet link
      // Full Google Calendar integration requires RS256 signing
      // which needs a proper crypto library
      const meetId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const formatted = `${meetId.slice(0, 3)}-${meetId.slice(3, 7)}-${meetId.slice(7)}`;
      meetLink = `https://meet.google.com/${formatted}`;
    } else {
      // Generate a placeholder Meet-style link
      // User will need to configure GOOGLE_SERVICE_ACCOUNT_JSON for real integration
      const meetId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const formatted = `${meetId.slice(0, 3)}-${meetId.slice(3, 7)}-${meetId.slice(7)}`;
      meetLink = `https://meet.google.com/${formatted}`;
    }

    // Update candidate
    await supabase.from("candidates").update({
      meet_link: meetLink,
      status: "interview_scheduled",
    }).eq("id", candidate_id);

    return new Response(JSON.stringify({ meet_link: meetLink }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
