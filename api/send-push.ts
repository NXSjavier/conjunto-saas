import type { IncomingMessage, ServerResponse } from 'http';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { createClient } from '@supabase/supabase-js';

type VercelRequest = IncomingMessage & { body?: any; query: Record<string, string | string[]> };
type VercelResponse = ServerResponse & { json: (data: any) => any; send: (data: any) => any; status: (code: number) => VercelResponse; setHeader: (name: string, value: string) => any };

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokens, notification, data } = req.body;

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ sent: 0, failed: 0, total: 0 });
    }

    const messagePayload: MulticastMessage = {
      tokens,
      notification: {
        title: notification?.title || '',
        body: notification?.body || '',
      },
      data: data || { url: '/' },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default_channel',
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', contentAvailable: true } },
      },
      webpush: {
        headers: { Urgency: 'high' },
        notification: {
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          requireInteraction: true,
        },
      },
    };

    const response = await getMessaging().sendEachForMulticast(messagePayload);

    const tokensToDelete: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success && result.error) {
        const code = result.error.code;
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          tokensToDelete.push(tokens[index]);
        }
      }
    });

    if (tokensToDelete.length > 0) {
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
    });
  } catch (error: any) {
    console.error('send-push error:', error);
    return res.status(500).json({ error: error.message });
  }
}
