-- Migración: tokens push multi-dispositivo
-- Un usuario puede tener varios dispositivos (PC + celular). Cada dispositivo
-- guarda su propio token FCM. La tabla anterior (profiles.fcm_token) solo
-- guardaba UN token y cada login lo sobrescribía.
-- Ejecutar en Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  profile_id TEXT,
  token TEXT NOT NULL UNIQUE,
  device_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_auth_user
  ON public.push_tokens (auth_user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_select ON public.push_tokens;
CREATE POLICY push_tokens_select ON public.push_tokens
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS push_tokens_write_own ON public.push_tokens;
CREATE POLICY push_tokens_write_own ON public.push_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = auth_user_id OR is_super_admin())
  WITH CHECK (auth.uid() = auth_user_id OR is_super_admin());

-- Limpiar el token de prueba que se usó para depurar
UPDATE public.profiles SET fcm_token = NULL WHERE fcm_token = 'test-token-debug-123';
