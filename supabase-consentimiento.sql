-- Migración: consentimiento de datos personales (LOPDP Ecuador)
-- Agrega columnas para registrar el consentimiento del tratamiento de datos.
-- Ejecutar en Supabase Dashboard → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consentido BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consentido_at TIMESTAMPTZ;
