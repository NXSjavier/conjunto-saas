-- Migración: registro de errores de la app (monitoreo self-hosted)
-- La app inserta aquí los errores no controlados; el super_admin los revisa.
-- Ejecutar en Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.app_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  auth_user_id UUID,
  profile_id TEXT,
  role TEXT,
  complex_id TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_errors_created
  ON public.app_errors (created_at DESC);

ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede reportar un error
DROP POLICY IF EXISTS app_errors_insert ON public.app_errors;
CREATE POLICY app_errors_insert ON public.app_errors
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Solo el super_admin puede leer los errores
DROP POLICY IF EXISTS app_errors_select ON public.app_errors;
CREATE POLICY app_errors_select ON public.app_errors
  FOR SELECT TO authenticated
  USING (public.is_super_admin());

-- Solo el super_admin puede limpiar errores antiguos
DROP POLICY IF EXISTS app_errors_delete ON public.app_errors;
CREATE POLICY app_errors_delete ON public.app_errors
  FOR DELETE TO authenticated
  USING (public.is_super_admin());
