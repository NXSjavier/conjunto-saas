-- Migración: registro de uso diario por usuario (para "Uso diario" por conjunto)
-- Cada vez que un usuario abre la app se registra/actualiza 1 fila por día.
-- El super_admin lee estas filas para ver uso diario por conjunto (hoy + últimos 7 días).
-- Ejecutar en Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL,
  profile_id TEXT,
  complex_id TEXT,
  role TEXT,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  sessions INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (auth_user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_usage_log_day
  ON public.usage_log (day);
CREATE INDEX IF NOT EXISTS idx_usage_log_complex_day
  ON public.usage_log (complex_id, day);
CREATE INDEX IF NOT EXISTS idx_usage_log_auth_day
  ON public.usage_log (auth_user_id, day);

ALTER TABLE public.usage_log ENABLE ROW LEVEL SECURITY;

-- Cada usuario autenticado puede leer sus propias filas
DROP POLICY IF EXISTS usage_log_select_own ON public.usage_log;
CREATE POLICY usage_log_select_own ON public.usage_log
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_super_admin());

-- Cada usuario puede insertar su propia fila del día
DROP POLICY IF EXISTS usage_log_insert_own ON public.usage_log;
CREATE POLICY usage_log_insert_own ON public.usage_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = auth_user_id);

-- Cada usuario puede actualizar su propia fila (last_seen, sessions)
DROP POLICY IF EXISTS usage_log_update_own ON public.usage_log;
CREATE POLICY usage_log_update_own ON public.usage_log
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_user_id OR public.is_super_admin())
  WITH CHECK (auth.uid() = auth_user_id OR public.is_super_admin());
