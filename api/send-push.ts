import type { IncomingMessage, ServerResponse } from 'http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

type VercelRequest = IncomingMessage & { body?: any; query: Record<string, string | string[]> };
type VercelResponse = ServerResponse & { 
  json: (data: any) => any; 
  send: (data: any) => any; 
  status: (code: number) => VercelResponse; 
  setHeader: (name: string, value: string) => any 
};

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Inicializar Firebase Admin
if (getApps().length === 0) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, hint: 'POST {tokens, notification, data}' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body: any = (req as any).body;
    if (body === undefined || body === null || body === '') {
      return res.status(400).json({ error: 'Missing body' });
    }
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    } else if (Buffer.isBuffer(body)) {
      try { body = JSON.parse(body.toString('utf8')); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
    }
    const { tokens, notification, data } = body || {};

    console.log(`📨 Enviando push a ${tokens?.length || 0} tokens`);
    console.log(`📨 Título: ${notification?.title || 'Sin título'}`);

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ sent: 0, failed: 0, total: 0 });
    }

    // PWA Android: payload optimizado para Chrome web push en background
    // - notification + data (data.url debe ser string)
    // - webpush.headers.Urgency high + silent:false para sonar con app cerrada
    const rawUrl = typeof data?.url === 'string' && data.url ? data.url : '/';
    const safeUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    // FCM data values deben ser strings
    const stringData: Record<string, string> = {};
    const srcData = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(srcData)) {
      if (v !== undefined && v !== null) stringData[String(k)] = String(v);
    }
    if (!stringData.url) stringData.url = safeUrl;
    // Link absoluto para webpush.fcmOptions.link (Chrome lo usa al tocar)
    const origin = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') || 'https://conjuntos-app-pwa.vercel.app';
    const absoluteLink = safeUrl.startsWith('http') ? safeUrl : `${origin}${safeUrl}`;

    const messagePayload: MulticastMessage = {
      tokens,
      notification: {
        title: notification?.title || 'Residex',
        body: notification?.body || '',
      },
      data: stringData,
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          silent: false,
        },
        fcmOptions: {
          link: absoluteLink,
        },
      },
    };

    // Enviar notificación
    const response = await getMessaging().sendEachForMulticast(messagePayload);
    
    console.log(`📊 Resultado: ${response.successCount} enviados, ${response.failureCount} fallidos`);

    // Limpiar tokens inválidos
    const tokensToDelete: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success && result.error) {
        const code = result.error.code;
        console.warn(`⚠️ Token fallido [${index}]: ${code}`);
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-expired'
        ) {
          tokensToDelete.push(tokens[index]);
        }
      }
    });

    // Eliminar tokens inválidos de la base de datos
    if (tokensToDelete.length > 0) {
      console.log(`🧹 Limpiando ${tokensToDelete.length} tokens inválidos`);
      await Promise.all([
        supabaseAdmin.from('push_tokens').delete().in('token', tokensToDelete),
        supabaseAdmin.from('profiles').update({ fcm_token: null }).in('fcm_token', tokensToDelete),
      ]);
    }

    return res.status(200).json({
      sent: response.successCount,
      failed: response.failureCount,
      total: tokens.length,
      cleaned: tokensToDelete.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error: any) {
    console.error('❌ Error en send-push:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}