-- Migracion segura de Conjuntos App a Supabase Auth.
-- Ejecutar una vez en Supabase SQL Editor.
-- No elimina datos existentes.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ALTER COLUMN password DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_complex_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT complex_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid() AND role = 'super_admin' AND status = 'active'
  );
$$;

ALTER FUNCTION public.current_profile_id() SET search_path = public;
ALTER FUNCTION public.current_profile_role() SET search_path = public;
ALTER FUNCTION public.current_complex_id() SET search_path = public;
ALTER FUNCTION public.is_super_admin() SET search_path = public;

ALTER TABLE residential_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Remove old open policies. service_role bypasses RLS automatically.
DO $$
DECLARE policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('residential_complexes','profiles','apartments','visitors','announcements','announcement_comments','incidents','reservations','notifications','audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  END LOOP;
END $$;

CREATE POLICY complexes_read ON residential_complexes FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY complexes_super_admin_insert ON residential_complexes FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
CREATE POLICY complexes_super_admin_update ON residential_complexes FOR UPDATE TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY complexes_super_admin_delete ON residential_complexes FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY profiles_read ON profiles FOR SELECT TO authenticated USING (
  auth_user_id = auth.uid() OR complex_id = public.current_complex_id()
);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid() AND id IS NOT NULL AND role = 'resident');
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY profiles_admin_insert ON profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.current_profile_role() IN ('admin','super_admin') AND
    (public.is_super_admin() OR complex_id = public.current_complex_id())
  );
CREATE POLICY profiles_admin_update ON profiles FOR UPDATE TO authenticated
  USING (
    public.current_profile_role() IN ('admin','super_admin') AND
    (public.is_super_admin() OR complex_id = public.current_complex_id())
  )
  WITH CHECK (
    public.current_profile_role() IN ('admin','super_admin') AND
    (public.is_super_admin() OR complex_id = public.current_complex_id())
  );
CREATE POLICY profiles_admin_delete ON profiles FOR DELETE TO authenticated
  USING (
    id <> public.current_profile_id() AND
    public.current_profile_role() IN ('admin','super_admin') AND
    (public.is_super_admin() OR complex_id = public.current_complex_id())
  );

CREATE POLICY apartments_read ON apartments FOR SELECT TO authenticated
  USING (complex_id = public.current_complex_id());
CREATE POLICY apartments_admin_write ON apartments FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id())
  WITH CHECK (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id());

CREATE POLICY visitors_read ON visitors FOR SELECT TO authenticated
  USING (complex_id = public.current_complex_id());
CREATE POLICY visitors_insert ON visitors FOR INSERT TO authenticated
  WITH CHECK (resident_id = public.current_profile_id() AND complex_id = public.current_complex_id());
CREATE POLICY visitors_update ON visitors FOR UPDATE TO authenticated
  USING (complex_id = public.current_complex_id())
  WITH CHECK (complex_id = public.current_complex_id());
CREATE POLICY visitors_delete_admin ON visitors FOR DELETE TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND (public.is_super_admin() OR complex_id = public.current_complex_id()));

CREATE POLICY announcements_read ON announcements FOR SELECT TO authenticated
  USING (complex_id = public.current_complex_id());
CREATE POLICY announcements_admin_write ON announcements FOR ALL TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id())
  WITH CHECK (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id());

CREATE POLICY comments_read ON announcement_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM announcements a WHERE a.id = announcement_id AND a.complex_id = public.current_complex_id()));
CREATE POLICY comments_insert ON announcement_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_profile_id() AND EXISTS (SELECT 1 FROM announcements a WHERE a.id = announcement_id AND a.complex_id = public.current_complex_id()));
CREATE POLICY comments_delete ON announcement_comments FOR DELETE TO authenticated
  USING (author_id = public.current_profile_id() OR public.current_profile_role() IN ('admin','super_admin'));

CREATE POLICY incidents_read ON incidents FOR SELECT TO authenticated
  USING (complex_id = public.current_complex_id());
CREATE POLICY incidents_insert ON incidents FOR INSERT TO authenticated
  WITH CHECK (reported_by = public.current_profile_id() AND complex_id = public.current_complex_id());
CREATE POLICY incidents_admin_update ON incidents FOR UPDATE TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id())
  WITH CHECK (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id());
CREATE POLICY incidents_admin_delete ON incidents FOR DELETE TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND (public.is_super_admin() OR complex_id = public.current_complex_id()));

CREATE POLICY reservations_read ON reservations FOR SELECT TO authenticated
  USING (complex_id = public.current_complex_id());
CREATE POLICY reservations_insert ON reservations FOR INSERT TO authenticated
  WITH CHECK (resident_id = public.current_profile_id() AND complex_id = public.current_complex_id());
CREATE POLICY reservations_admin_update ON reservations FOR UPDATE TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id())
  WITH CHECK (public.current_profile_role() IN ('admin','super_admin') AND complex_id = public.current_complex_id());
CREATE POLICY reservations_owner_delete ON reservations FOR DELETE TO authenticated
  USING (resident_id = public.current_profile_id() OR (public.current_profile_role() IN ('admin','super_admin') AND (public.is_super_admin() OR complex_id = public.current_complex_id())));

CREATE POLICY notifications_read ON notifications FOR SELECT TO authenticated
  USING (user_id = public.current_profile_id());
CREATE POLICY notifications_update ON notifications FOR UPDATE TO authenticated
  USING (user_id = public.current_profile_id())
  WITH CHECK (user_id = public.current_profile_id());
CREATE POLICY notifications_delete ON notifications FOR DELETE TO authenticated
  USING (user_id = public.current_profile_id());

CREATE POLICY audits_admin_read ON audit_logs FOR SELECT TO authenticated
  USING (public.current_profile_role() IN ('admin','super_admin') AND (complex_id = public.current_complex_id() OR public.current_profile_role() = 'super_admin'));

GRANT EXECUTE ON FUNCTION public.current_profile_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_profile_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_complex_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;

-- Vincula automaticamente los usuarios de Auth que tengan el mismo correo.
UPDATE profiles p
SET auth_user_id = u.id, password = NULL
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND p.auth_user_id IS NULL;

-- Realtime seguro para cambios de la base.
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE residential_complexes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE profiles; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE apartments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE visitors; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE announcement_comments; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE incidents; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
