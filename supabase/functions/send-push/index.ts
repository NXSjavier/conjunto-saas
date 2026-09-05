// Edge Function: send-push
// Envía push notifications via FCM HTTP v1 API
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Firebase Admin credentials from env vars
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL") || "";
const FIREBASE_PRIVATE_KEY = (Deno.env.get("FIREBASE_PRIVATE_KEY") || "").replace(/\\n/g, "\n");

async function getAccessToken(): Promise<string | null> {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const dataToSign = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    enc.encode(FIREBASE_PRIVATE_KEY),
    { name: "RSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSA-PKCS1-v1_5", key, enc.encode(dataToSign));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${headerB64}.${payloadB64}.${sigB64}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token || null;
}

async function sendFCM(token: string, title: string, body: string, data: Record<string, string> = {}): Promise<boolean> {
  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: {
            priority: "high",
            notification: {
              channel_id: "conjuntos_urgent_alerts",
              sound: "default",
            },
          },
          webpush: {
            headers: { TTL: "86400" },
            notification: {
              title,
              body,
              icon: "/icons/icon-192.svg",
              badge: "/icons/icon-192.svg",
            },
          },
        },
      }),
    }
  );
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let body: any;
  try { body = await req.json(); } catch { body = {}; }

  const { token, tokens, title, body: msgBody, url, tag } = body;

  if (!title || !msgBody) {
    return new Response(JSON.stringify({ error: "title y body son requeridos" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = { url: url || "/", tag: tag || "conjuntos-notification" };
  const targetTokens: string[] = tokens || (token ? [token] : []);

  if (targetTokens.length === 0) {
    return new Response(JSON.stringify({ error: "No hay tokens para enviar" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let sent = 0;
  let failed = 0;

  for (const t of targetTokens) {
    const ok = await sendFCM(t, title, msgBody, data);
    if (ok) sent++;
    else failed++;
  }

  return new Response(JSON.stringify({ sent, failed, total: targetTokens.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
