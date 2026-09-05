-- Fix RLS: super_admin no veía admins/otros datos porque las políticas solo permitían
-- complex_id = current_complex_id() y super_admin tiene complex_id = NULL.
-- Síntoma: "se crea pero no se guarda" -> Edge Function 201 pero SELECT como super_admin retornaba 0 filas.
-- Solución: añadir OR is_super_admin() a todas las políticas de lectura.

DROP POLICY IF EXISTS profiles_read ON profiles;
CREATE POLICY profiles_read ON profiles FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid() OR complex_id = public.current_complex_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS apartments_read ON apartments;
CREATE POLICY apartments_read ON apartments FOR SELECT TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS visitors_read ON visitors;
CREATE POLICY visitors_read ON visitors FOR SELECT TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS announcements_read ON announcements;
CREATE POLICY announcements_read ON announcements FOR SELECT TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS comments_read ON announcement_comments;
CREATE POLICY comments_read ON announcement_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM announcements a WHERE a.id = announcement_comments.announcement_id AND (a.complex_id = public.current_complex_id() OR public.is_super_admin())) OR public.is_super_admin()
);

DROP POLICY IF EXISTS incidents_read ON incidents;
CREATE POLICY incidents_read ON incidents FOR SELECT TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);

DROP POLICY IF EXISTS reservations_read ON reservations;
CREATE POLICY reservations_read ON reservations FOR SELECT TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);

-- Escritura admin también debe permitir super_admin en cualquier complejo
DROP POLICY IF EXISTS apartments_admin_write ON apartments;
CREATE POLICY apartments_admin_write ON apartments FOR ALL TO authenticated USING (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
) WITH CHECK (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
);

DROP POLICY IF EXISTS announcements_admin_write ON announcements;
CREATE POLICY announcements_admin_write ON announcements FOR ALL TO authenticated USING (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
) WITH CHECK (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
);

DROP POLICY IF EXISTS incidents_admin_update ON incidents;
CREATE POLICY incidents_admin_update ON incidents FOR UPDATE TO authenticated USING (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
) WITH CHECK (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
);

DROP POLICY IF EXISTS reservations_admin_update ON reservations;
CREATE POLICY reservations_admin_update ON reservations FOR UPDATE TO authenticated USING (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
) WITH CHECK (
  public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.is_super_admin())
);

DROP POLICY IF EXISTS visitors_update ON visitors;
CREATE POLICY visitors_update ON visitors FOR UPDATE TO authenticated USING (
  complex_id = public.current_complex_id() OR public.is_super_admin()
) WITH CHECK (
  complex_id = public.current_complex_id() OR public.is_super_admin()
);
