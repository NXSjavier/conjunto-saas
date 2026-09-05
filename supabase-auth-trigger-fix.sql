-- Fix: Trigger defectuoso que bloqueaba la creación de auth.users
-- Síntoma: POST /auth/v1/admin/users -> 500 "Database error creating new user"
-- Causa: El trigger on_auth_user_created llamaba a handle_new_user() que insertaba en public.profiles
--        con columnas inexistentes (residential_complex_id, apartment_number, etc.) del esquema antiguo.
--        Al fallar el trigger, toda la transacción de auth.users se revertía.
-- Solución: Eliminar el trigger y la función. La app crea perfiles manualmente después,
--          via Edge Functions admin-create/guard-create (service_role) o via supabaseRepo.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Verificación: después de ejecutar, este query debe retornar 0 filas:
-- SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema='auth' AND event_object_table='users';
