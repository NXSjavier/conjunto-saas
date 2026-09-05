// Edge Function: send-push
// Envía push notifications via FCM HTTP v1 API

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "";
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL") || "";
const RAW_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY") || "";
const FIREBASE_PRIVATE_KEY = RAW_KEY.replace(/\\n/g, "\n").replace(/\\r/g, "");

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
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.error("Firebase env vars missing:", {
      hasProjectId: !!FIREBASE_PROJECT_ID,
      hasClientEmail: !!FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!FIREBASE_PRIVATE_KEY,
      rawKeyLen: RAW_KEY.length,
      processedKeyLen: FIREBASE_PRIVATE_KEY.length,
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
      { name: "RSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const sigBuf = await crypto.subtle.sign("RSA-PKCS1-v1_5", key, new TextEncoder().encode(dataToSign));
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
    return tokenData.access_token;
  } catch (err) {
    console.error("getAccessToken error:", String(err));
    return null;
  }
}

async function sendFCM(targetToken: string, title: string, msgBody: string, data: Record<string, string> = {}): Promise<boolean> {
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
          token: targetToken,
          notification: { title, body: msgBody },
          data,
          webpush: {
            headers: { TTL: "86400" },
            notification: { title, body: msgBody, icon: "/icons/icon-192.svg", badge: "/icons/icon-192.svg" },
          },
        },
      }),
    }
  );
  const result = await res.json();
  if (!res.ok) console.error("FCM send error:", JSON.stringify(result));
  return res.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let reqBody: any;
  try { reqBody = await req.json(); } catch { reqBody = {}; }

  const { token, tokens, title, body: msgBody, url, tag } = reqBody;

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
