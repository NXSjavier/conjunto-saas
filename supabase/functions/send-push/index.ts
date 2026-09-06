// Edge Function: send-push
// Envía push notifications via FCM HTTP v1 API
// Soporta: flat body ({ tokens, title, body, url }) y wrapped ({ tokens, notification, data })
// Limpia automáticamente tokens inválidos (NOT_FOUND / UNREGISTERED)

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Firebase credentials ---
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL") || "";
const RAW_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY") || "";
const FIREBASE_PRIVATE_KEY = RAW_KEY.replace(/\\n/g, "\n").replace(/\\r/g, "");

// --- Token cache ---
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;

// --- Supabase admin (for token cleanup) ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// --- JWT helpers ---

function base64url(input: Uint8Array | string): string {
  let b64: string;
  if (typeof input === "string") {
    b64 = btoa(input);
  } else {
    let binary = "";
    for (let i = 0; i < input.length; i++) binary += String.fromCharCode(input[i]);
    b64 = btoa(binary);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToBinaryDer(pem: string): ArrayBuffer {
  const cleaned = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .replace(/\s/g, "");
  const raw = atob(cleaned);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string | null> {
  // Return cached token if it has more than 5 minutes of life
  if (cachedAccessToken && Date.now() < cachedTokenExpiresAt - 300_000) {
    return cachedAccessToken;
  }

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("Firebase env vars missing:", {
      hasProjectId: !!FIREBASE_PROJECT_ID,
      hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
    });
    return null;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const headerB64 = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payloadB64 = base64url(JSON.stringify({
      iss: FIREBASE_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }));
    const dataToSign = `${headerB64}.${payloadB64}`;

    const derBuffer = pemToBinaryDer(FIREBASE_PRIVATE_KEY);

    const key = await crypto.subtle.importKey(
      "pkcs8",
      derBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuf = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(dataToSign));
    const sigB64 = base64url(new Uint8Array(sigBuf));

    const jwt = `${headerB64}.${payloadB64}.${sigB64}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Google token exchange failed:", JSON.stringify(tokenData));
      return null;
    }

    // Cache for ~55 minutes (token valid for 60)
    cachedAccessToken = tokenData.access_token;
    cachedTokenExpiresAt = now * 1000 + (tokenData.expires_in || 3600) * 1000;

    return cachedAccessToken;
  } catch (err) {
    console.error("getAccessToken error:", String(err));
    return null;
  }
}

// --- FCM send ---

interface FcmResult {
  token: string;
  status: "ok" | "invalid_token" | "error";
  error?: string;
}

async function sendFCM(
  targetToken: string,
  title: string,
  msgBody: string,
  data: Record<string, string>,
  accessToken: string
): Promise<FcmResult> {
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
          token: targetToken,
          notification: { title, body: msgBody },
          data,
          android: {
            priority: "high",
            ttl: "86400s",
            notification: {
              title,
              body: msgBody,
              channel_id: "default_channel",
              sound: "default",
              click_action: "FLUTTER_NOTIFICATION_CLICK",
              default_sound: true,
              default_vibrate_timings: true,
              default_light_settings: true,
              visibility: "PUBLIC",
              priority: "MAX",
            },
          },
          webpush: {
            headers: { TTL: "86400", Urgency: "high" },
            notification: { title, body: msgBody, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                alert: { title, body: msgBody },
                sound: "default",
                contentAvailable: true,
              },
            },
          },
        },
      }),
    }
  );

  const result = await res.json();

  if (res.ok) {
    return { token: targetToken, status: "ok" };
  }

  const errorCode = result?.error?.status || "";
  const details = result?.error?.details?.[0]?.errorCode || "";

  if (errorCode === "NOT_FOUND" || details === "UNREGISTERED" || errorCode === "INVALID_ARGUMENT") {
    return { token: targetToken, status: "invalid_token", error: errorCode };
  }

  console.error("FCM send error:", JSON.stringify(result));
  return { token: targetToken, status: "error", error: errorCode || JSON.stringify(result) };
}

// --- Token cleanup ---

async function cleanupInvalidTokens(invalidTokens: string[]) {
  if (invalidTokens.length === 0 || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return;

  try {
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    };

    for (const token of invalidTokens) {
      // Delete from push_tokens
      await fetch(`${SUPABASE_URL}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers,
      });
      // Clear from profiles.fcm_token
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?fcm_token=eq.${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ fcm_token: null }),
      });
    }
    console.log(`Cleaned ${invalidTokens.length} invalid tokens`);
  } catch (err) {
    console.error("cleanup error:", String(err));
  }
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let reqBody: any;
  try { reqBody = await req.json(); } catch { reqBody = {}; }

  // Support both flat and wrapped body formats
  const {
    token,
    tokens,
    title: flatTitle,
    body: flatBody,
    url: flatUrl,
    tag: flatTag,
    notification,
    data: reqData,
  } = reqBody;

  const title = flatTitle || notification?.title || "";
  const msgBody = flatBody || notification?.body || "";

  if (!title || !msgBody) {
    return new Response(JSON.stringify({ error: "title y body son requeridos" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = { url: reqData?.url || flatUrl || "/", tag: reqData?.tag || flatTag || "conjuntos-notification" };
  const targetTokens: string[] = tokens || (token ? [token] : []);

  if (targetTokens.length === 0) {
    return new Response(JSON.stringify({ error: "No hay tokens para enviar" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return new Response(JSON.stringify({ error: "No se pudo obtener access token de Firebase" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  // Process sequentially to respect FCM rate limits
  for (const t of targetTokens) {
    const result = await sendFCM(t, title, msgBody, data, accessToken);
    if (result.status === "ok") {
      sent++;
    } else {
      failed++;
      if (result.status === "invalid_token") {
        invalidTokens.push(t);
      }
    }
  }

  // Cleanup invalid tokens in background (don't block response)
  if (invalidTokens.length > 0) {
    cleanupInvalidTokens(invalidTokens).catch(() => {});
  }

  return new Response(JSON.stringify({ sent, failed, total: targetTokens.length, cleaned: invalidTokens.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
