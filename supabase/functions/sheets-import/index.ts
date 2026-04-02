import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parseLeadRows,
  parseMetaRows,
  parseGhlRows,
  parseGhlLeadsTab,
  type SheetsLeadRow,
  type SheetsMetaAdRow,
} from "./parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SHEET_ID = "16ZQU2d2u16bYotXCDm9DvO_XR_1iOYoci89QjAY3Xao";
const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const BATCH_SIZE = 500;

const TAB_MAP: Record<string, string> = {
  leads: "LEADS",
  meta: "META Adveronix",
  ghl: "BASE GHL",
  ghlLeads: "GHL LEADS",
};

// ── JWT helpers (copied from google-sheets-data) ─────────────────────────────

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

async function getAccessToken(sa: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < cachedToken.expiresAt) return cachedToken.token;

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
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput)
    )
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

// ── Hash helper ──────────────────────────────────────────────────────────────

async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function computeLeadHash(r: SheetsLeadRow): Promise<string> {
  return hashText(
    `${r.email}|${r.telefone}|${r.data_cadastro ?? ""}|${r.closer}|${r.data_call ?? ""}`
  );
}

async function computeMetaHash(r: SheetsMetaAdRow): Promise<string> {
  return hashText(
    `${r.day ?? ""}|${r.ad_id}|${r.campaign_id}|${r.ad_name}`
  );
}

// ── Batch upsert helper ──────────────────────────────────────────────────────

async function batchUpsert(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[],
  conflictColumn: string
): Promise<{ inserted: number; errors: number; firstError?: Record<string, unknown> }> {
  let inserted = 0;
  let errors = 0;
  let firstError: Record<string, unknown> | undefined;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn, ignoreDuplicates: false });

    if (error) {
      console.error(`Error upserting batch into ${table}:`, JSON.stringify(error));
      errors += batch.length;
      // Store first error for debugging
      if (!firstError) {
        firstError = { table, message: error.message, details: error.details, hint: error.hint, code: error.code };
      }
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors, firstError };
}

// ── For GHL tables with partial unique index (WHERE contact_id != '') ────────
// PostgREST does not support partial unique indexes for upsert,
// so we do a manual delete + insert approach for GHL tables.

async function syncGhlTable(
  supabase: ReturnType<typeof createClient>,
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  // Get existing contact_ids
  const { data: existing } = await supabase
    .from(table)
    .select("contact_id")
    .neq("contact_id", "");

  const existingIds = new Set(
    (existing ?? []).map((r: { contact_id: string }) => r.contact_id)
  );

  const toUpdate: Record<string, unknown>[] = [];
  const toInsert: Record<string, unknown>[] = [];

  for (const row of rows) {
    const cid = row.contact_id as string;
    if (cid && existingIds.has(cid)) {
      toUpdate.push(row);
    } else {
      toInsert.push(row);
    }
  }

  // Update existing rows
  for (const row of toUpdate) {
    const { error } = await supabase
      .from(table)
      .update(row)
      .eq("contact_id", row.contact_id as string);
    if (error) {
      errors++;
    } else {
      inserted++;
    }
  }

  // Insert new rows in batches
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);
    if (error) {
      console.error(`Error inserting batch into ${table}:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { inserted, errors };
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ── Config ──────────────────────────────────────────────────────────────
    const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
    if (!saJson) {
      return new Response(
        JSON.stringify({ error: "GOOGLE_SERVICE_ACCOUNT not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Parse mode from query params ────────────────────────────────────────
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "sync"; // "sync" or "full"

    // ── Authenticate with Google ────────────────────────────────────────────
    let parsed: string = saJson;
    if (parsed.startsWith('"') && parsed.endsWith('"')) {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        /* use as-is */
      }
    }
    const sa = JSON.parse(parsed);
    const accessToken = await getAccessToken(sa);

    // ── Fetch all tabs in parallel ──────────────────────────────────────────
    console.log(`[sheets-import] Starting ${mode} import...`);

    const rawData: Record<string, string[][]> = {};
    const fetchPromises = Object.entries(TAB_MAP).map(
      async ([key, tabName]) => {
        const encoded = encodeURIComponent(tabName);
        const fetchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encoded}`;
        const res = await fetch(fetchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(
            `Failed to fetch tab "${tabName}" [${res.status}]: ${body}`
          );
        }
        const data = await res.json();
        rawData[key] = data.values || [];
      }
    );

    await Promise.all(fetchPromises);

    // ── Parse rows ──────────────────────────────────────────────────────────
    const leads = parseLeadRows(rawData.leads);
    const meta = parseMetaRows(rawData.meta);
    const ghl = parseGhlRows(rawData.ghl);
    const ghlLeads = parseGhlLeadsTab(rawData.ghlLeads);

    console.log(
      `[sheets-import] Parsed: ${leads.length} leads, ${meta.length} meta ads, ${ghl.length} ghl base, ${ghlLeads.length} ghl leads`
    );

    // ── Full mode: truncate tables first ────────────────────────────────────
    if (mode === "full") {
      console.log("[sheets-import] Full mode: truncating tables...");
      for (const table of [
        "sheets_leads",
        "sheets_meta_ads",
        "sheets_ghl_base",
        "sheets_ghl_leads",
      ]) {
        await supabase.rpc("", {}).then(() => {}); // noop
        // Use delete with a broad filter to truncate (PostgREST doesn't support TRUNCATE)
        await supabase.from(table).delete().gte("imported_at", "1970-01-01");
      }
    }

    // ── Compute row_hash for leads and meta ────────────────────────────────
    const leadsWithHash = await Promise.all(
      leads.map(async (r) => ({ ...r, row_hash: await computeLeadHash(r) }))
    );
    const metaWithHash = await Promise.all(
      meta.map(async (r) => ({ ...r, row_hash: await computeMetaHash(r) }))
    );

    // ── Upsert into normalized tables ───────────────────────────────────────
    const results: Record<string, { inserted: number; errors: number }> = {};

    // sheets_leads uses row_hash for dedup
    results.leads = await batchUpsert(
      supabase,
      "sheets_leads",
      leadsWithHash as unknown as Record<string, unknown>[],
      "row_hash"
    );

    // sheets_meta_ads uses row_hash for dedup
    results.meta = await batchUpsert(
      supabase,
      "sheets_meta_ads",
      metaWithHash as unknown as Record<string, unknown>[],
      "row_hash"
    );

    // GHL tables use partial unique index (contact_id WHERE != '')
    results.ghl = await syncGhlTable(
      supabase,
      "sheets_ghl_base",
      ghl as unknown as Record<string, unknown>[]
    );

    results.ghlLeads = await syncGhlTable(
      supabase,
      "sheets_ghl_leads",
      ghlLeads as unknown as Record<string, unknown>[]
    );

    const elapsed = Date.now() - startTime;
    console.log(
      `[sheets-import] Done in ${elapsed}ms:`,
      JSON.stringify(results)
    );

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        elapsed_ms: elapsed,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("[sheets-import] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
