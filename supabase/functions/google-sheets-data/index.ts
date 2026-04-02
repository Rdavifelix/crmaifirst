import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEET_ID = "16ZQU2d2u16bYotXCDm9DvO_XR_1iOYoci89QjAY3Xao";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const TAB_MAP: Record<string, string> = {
  leads: "LEADS",
  meta: "META Adveronix",
  ghl: "BASE GHL",
  ghlLeads: "GHL LEADS",
};

// ── JWT / Token helpers ────────────────────────────────────────────────────────

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function textToBase64url(text: string): string {
  return base64url(new TextEncoder().encode(text));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && now < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const header = textToBase64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = textToBase64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signingInput = `${header}.${payload}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput))
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Token exchange failed [${tokenRes.status}]: ${body}`);
  }

  const tokenData = await tokenRes.json();
  cachedToken = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in ?? 3600) - 300,
  };

  return cachedToken.token;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!saJson) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Supabase client (service role for cache access) ─────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Check cache ─────────────────────────────────────────────────────────────
  try {
    const { data: cached } = await supabase
      .from("sheets_cache")
      .select("data, cached_at")
      .eq("id", "main")
      .single();

    if (cached && cached.cached_at) {
      const age = Date.now() - new Date(cached.cached_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log(`Cache HIT (age: ${Math.round(age / 1000)}s)`);
        return new Response(JSON.stringify(cached.data), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Cache": "HIT",
            "X-Cache-Age": String(Math.round(age / 1000)),
          },
        });
      }
      console.log(`Cache STALE (age: ${Math.round(age / 1000)}s) — refreshing`);
    } else {
      console.log("Cache MISS — fetching from Google");
    }
  } catch (e) {
    console.warn("Cache check failed, proceeding without cache:", e);
  }

  // ── Fetch from Google Sheets ─────────────────────────────────────────────────
  try {
    let parsed: string = saJson;
    if (parsed.startsWith('"') && parsed.endsWith('"')) {
      try { parsed = JSON.parse(parsed); } catch { /* use as-is */ }
    }
    const sa = JSON.parse(parsed);
    const accessToken = await getAccessToken(sa);

    const results: Record<string, string[][]> = {};
    let rateLimited = false;

    const fetches = Object.entries(TAB_MAP).map(async ([key, tabName]) => {
      const encoded = encodeURIComponent(tabName);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encoded}`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.status === 429) {
          console.error(`Google Sheets rate limit for tab "${tabName}"`);
          rateLimited = true;
          results[key] = [];
          return;
        }
        if (!res.ok) {
          const body = await res.text();
          console.error(`Google Sheets error for tab "${tabName}" [${res.status}]: ${body}`);
          results[key] = [];
          return;
        }
        const data = await res.json();
        results[key] = data.values || [];
      } catch (e) {
        console.error(`Failed to fetch tab "${tabName}":`, e);
        results[key] = [];
      }
    });

    await Promise.all(fetches);

    if (rateLimited) {
      return new Response(JSON.stringify({ rateLimited: true }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Store in cache ─────────────────────────────────────────────────────────
    try {
      await supabase.from("sheets_cache").upsert({
        id: "main",
        data: results,
        cached_at: new Date().toISOString(),
      });
      console.log("Cache updated");
    } catch (e) {
      console.warn("Failed to update cache:", e);
    }

    return new Response(JSON.stringify(results), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-Cache": "MISS",
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching Google Sheets:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
