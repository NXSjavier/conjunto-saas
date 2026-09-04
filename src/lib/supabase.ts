import { createClient } from '@supabase/supabase-js';

// Read env variables safely in Vite / Web & Expo environments with default project credentials
const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env) || {};
const DEFAULT_SUPABASE_URL = 'https://kptuyksmdomgqntsdzsu.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdHV5a3NtZG9tZ3FudHNkenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTg4ODQsImV4cCI6MjEwMzM3NDg4NH0.hGMnZHjG_IHJyCvgE67vPUGRV6WU7Nh2jfsTUcgkUcU';

const supabaseUrl = (
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.EXPO_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL : '') ||
  DEFAULT_SUPABASE_URL
) as string;

const supabaseAnonKey = (
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env ? process.env.VITE_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY : '') ||
  DEFAULT_SUPABASE_ANON_KEY
) as string;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('TU_PROJECT_REF') &&
  !supabaseUrl.includes('your-project') &&
  supabaseUrl.startsWith('http')
);

// Live Supabase Client if credentials are provided
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

export interface ConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  message: string;
  checkedAt: string;
}

// Diagnostic helper to test Supabase connection from UI
export async function checkSupabaseHealth(): Promise<ConnectionStatus> {
  const now = new Date().toLocaleTimeString();
  if (!isSupabaseConfigured || !supabase) {
    return {
      isConfigured: false,
      isConnected: false,
      url: supabaseUrl || 'No configurada',
      message: 'Supabase no está configurado aún. La app opera en modo Local / Demo.',
      checkedAt: now,
    };
  }

  try {
    const { data, error } = await supabase.from('residential_complexes').select('id, name').limit(1);
    if (error) {
      // Table might not exist yet if script hasn't been run
      if (error.code === '42P01') {
        return {
          isConfigured: true,
          isConnected: false,
          url: supabaseUrl,
          message: 'Conectado a Supabase pero las tablas no existen aún. Ejecuta el script SQL en el SQL Editor.',
          checkedAt: now,
        };
      }
      return {
        isConfigured: true,
        isConnected: false,
        url: supabaseUrl,
        message: `Error de consulta en Supabase: ${error.message}`,
        checkedAt: now,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      url: supabaseUrl,
      message: `Conexión activa con Supabase. (${data?.length ?? 0} registros encontrados en residential_complexes)`,
      checkedAt: now,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido de red';
    return {
      isConfigured: true,
      isConnected: false,
      url: supabaseUrl,
      message: `No se pudo conectar a Supabase: ${msg}`,
      checkedAt: now,
    };
  }
}
