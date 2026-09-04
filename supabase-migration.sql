-- ============================================
-- CONJUNTOS APP - Migración a Supabase
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================

-- Eliminar tablas existentes si existen (orden inverso por dependencias)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reservation_status_history CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS visitors CASCADE;
DROP TABLE IF EXISTS apartments CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS residential_complexes CASCADE;

-- ============================================
-- TABLA: residential_complexes
-- ============================================
CREATE TABLE residential_complexes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  address TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('trial', 'active', 'past_due', 'blocked')),
  subscription_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked'))
);

-- ============================================
-- TABLA: profiles (usuarios: super_admin, admin, resident, guard)
-- ============================================
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'resident', 'guard')),
  complex_id TEXT REFERENCES residential_complexes(id) ON DELETE CASCADE,
  apartment TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
  face_photo TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: apartments
-- ============================================
CREATE TABLE apartments (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  resident_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: visitors
-- ============================================
CREATE TABLE visitors (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  purpose TEXT,
  destination_apartment TEXT,
  resident_name TEXT,
  resident_id TEXT,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'in', 'out', 'rejected')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: announcements
-- ============================================
CREATE TABLE announcements (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  author_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: announcement_comments
-- ============================================
CREATE TABLE announcement_comments (
  id TEXT PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_id TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: incidents
-- ============================================
CREATE TABLE incidents (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  reported_by TEXT,
  apartment TEXT,
  attachments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: reservations
-- ============================================
CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  complex_id TEXT NOT NULL REFERENCES residential_complexes(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  reservation_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  resident_id TEXT,
  resident_name TEXT,
  apartment TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: notifications
-- ============================================
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: audit_logs
-- ============================================
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  complex_id TEXT REFERENCES residential_complexes(id) ON DELETE CASCADE,
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para performance
-- ============================================
CREATE INDEX idx_profiles_complex ON profiles(complex_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_apartments_complex ON apartments(complex_id);
CREATE INDEX idx_apartments_resident ON apartments(resident_id);
CREATE INDEX idx_visitors_complex ON visitors(complex_id);
CREATE INDEX idx_visitors_code ON visitors(code);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_announcements_complex ON announcements(complex_id);
CREATE INDEX idx_incidents_complex ON incidents(complex_id);
CREATE INDEX idx_reservations_complex ON reservations(complex_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_audit_logs_complex ON audit_logs(complex_id);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
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

-- ============================================
-- POLÍTICAS RLS - Acceso completo con service_role
-- La app usa el service_role key en el servidor,
-- así que las políticas permiten todo para service_role.
-- En el frontend usamos anon key con políticas específicas.
-- ============================================

-- Permitir todo para service_role (servidor)
CREATE POLICY "Allow all for service role" ON residential_complexes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON apartments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON visitors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON announcements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON announcement_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON incidents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON reservations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Permitir lectura a anon (necesario para login y datos públicos)
CREATE POLICY "Allow read for anon" ON residential_complexes FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON profiles FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON apartments FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON visitors FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON announcements FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON announcement_comments FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON incidents FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON reservations FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow read for anon" ON audit_logs FOR SELECT USING (true);

-- Permitir insert/update/delete a anon (para login y registro)
CREATE POLICY "Allow insert for anon" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for anon" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow insert for anon" ON visitors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for anon" ON visitors FOR UPDATE USING (true);
CREATE POLICY "Allow insert for anon" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anon" ON announcement_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anon" ON incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anon" ON reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for anon" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for anon" ON notifications FOR UPDATE USING (true);

-- ============================================
-- HABILITAR REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE residential_complexes;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE apartments;
ALTER PUBLICATION supabase_realtime ADD TABLE visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;

-- ============================================
-- DATOS INICIALES (Seed)
-- ============================================
INSERT INTO residential_complexes (id, name, code, address, plan, subscription_status, subscription_expiry, status, created_at)
VALUES (
  'c101-palmas-2026',
  'Residencial Las Palmas',
  'LP-2026-X8T5',
  'Av. Las Palmas #450, Torre A',
  'pro',
  'active',
  NOW() + INTERVAL '30 days',
  'active',
  NOW()
);

-- Super Admin
INSERT INTO profiles (id, name, email, password, role, complex_id, apartment, phone, status, created_at)
VALUES (
  'u-super',
  'Joel Solis',
  'joelsolis17900@gmail.com',
  'superadmin123',
  'super_admin',
  NULL,
  NULL,
  '+57 300 000 0000',
  'active',
  NOW()
);

-- Apartamentos de ejemplo
INSERT INTO apartments (id, complex_id, number, floor, status, resident_id, created_at)
VALUES
  ('apt-101', 'c101-palmas-2026', '101', 1, 'available', NULL, NOW()),
  ('apt-102', 'c101-palmas-2026', '102', 1, 'available', NULL, NOW()),
  ('apt-201', 'c101-palmas-2026', '201', 2, 'available', NULL, NOW());

-- Notificación inicial
INSERT INTO notifications (id, user_id, title, message, read, created_at)
VALUES (
  'notif-super',
  'u-super',
  'Acceso verificado',
  'Tu cuenta superadmin está lista para operar.',
  0,
  NOW()
);

-- Auditoría inicial
INSERT INTO audit_logs (id, complex_id, user_id, user_name, action, entity, entity_id, details, created_at)
VALUES (
  'aud-1',
  'c101-palmas-2026',
  'u-super',
  'Joel Solis',
  'account_initialized',
  'profile',
  'u-super',
  '{"email": "joelsolis17900@gmail.com"}',
  NOW()
);
