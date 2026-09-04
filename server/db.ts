import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'database.sqlite');

export interface DatabaseService {
  query: <T = any>(sql: string, params?: any[]) => T[];
  run: (sql: string, params?: any[]) => { changes: number; lastInsertRowid?: number };
  save: () => void;
}

let dbInstance: any = null;

export async function getDatabase(): Promise<DatabaseService> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  let db: any;

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Could not read existing database.sqlite, creating fresh database...', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  const save = () => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(DB_PATH, buffer);
    } catch (err) {
      console.error('Failed to save SQLite database to disk:', err);
    }
  };

  // Initialize Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS residential_complexes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT,
      plan TEXT DEFAULT 'pro',
      subscription_status TEXT DEFAULT 'active',
      subscription_expiry TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      complex_id TEXT,
      apartment TEXT,
      phone TEXT,
      status TEXT DEFAULT 'active',
      face_photo TEXT,
      fcm_token TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS apartments (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      number TEXT NOT NULL,
      floor INTEGER DEFAULT 1,
      status TEXT DEFAULT 'occupied',
      resident_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS visitors (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      code TEXT NOT NULL,
      visitor_name TEXT NOT NULL,
      purpose TEXT,
      destination_apartment TEXT,
      resident_name TEXT,
      resident_id TEXT,
      status TEXT DEFAULT 'registered',
      checked_in_at TEXT,
      checked_out_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_name TEXT,
      author_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcement_comments (
      id TEXT PRIMARY KEY,
      announcement_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_id TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      reported_by TEXT,
      apartment TEXT,
      attachments TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      area_name TEXT NOT NULL,
      reservation_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      resident_id TEXT,
      resident_name TEXT,
      apartment TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(complex_id) REFERENCES residential_complexes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audits (
      id TEXT PRIMARY KEY,
      complex_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity TEXT,
      entity_id TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_error_logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      context TEXT,
      url TEXT,
      user_agent TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Check and seed initial data if empty
  const countRes = db.exec("SELECT COUNT(*) as c FROM residential_complexes;");
  const count = countRes[0]?.values[0]?.[0] || 0;

  if (count === 0) {
    // Clean stale partial seed data from earlier failed runs before restoring the live base setup.
    ['notifications', 'audits', 'announcement_comments', 'announcements', 'visitors', 'reservations', 'incidents', 'apartments', 'profiles'].forEach((table) => {
      try {
        db.run(`DELETE FROM ${table}`);
      } catch (err) {
        console.warn(`Unable to clear stale rows from ${table}:`, err);
      }
    });

    const complexId = 'c101-palmas-2026';
    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.run(
      `INSERT INTO residential_complexes (id, name, code, address, plan, subscription_status, subscription_expiry, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [complexId, 'Residencial Las Palmas', 'LP-2026-X8T5', 'Av. Las Palmas #450, Torre A', 'pro', 'active', expiry, 'active', now]
    );

    // Seed a single real super admin account for the live testing user
    // Use OR REPLACE so a stale DB with an older super-admin row does not crash startup.
    db.run(
      `INSERT OR REPLACE INTO profiles (id, name, email, password, role, complex_id, apartment, phone, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['u-super', 'Joel Solis', 'joelsolis17900@gmail.com', 'superadmin123', 'super_admin', null, null, '+57 300 000 0000', 'active', now]
    );

    // Keep the base residential setup without demo users and demo data
    db.run(
      `INSERT INTO apartments (id, complex_id, number, floor, status, resident_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['apt-101', complexId, '101', 1, 'available', null, now]
    );
    db.run(
      `INSERT INTO apartments (id, complex_id, number, floor, status, resident_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['apt-102', complexId, '102', 1, 'available', null, now]
    );
    db.run(
      `INSERT INTO apartments (id, complex_id, number, floor, status, resident_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['apt-201', complexId, '201', 2, 'available', null, now]
    );

    // Initial notification for the super admin user
    db.run(
      `INSERT INTO notifications (id, user_id, title, message, read, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['notif-super', 'u-super', 'Acceso verificado', 'Tu cuenta superadmin está lista para operar en modo real.', 0, now]
    );

    db.run(
      `INSERT INTO audits (id, complex_id, user_id, user_name, action, entity, entity_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['aud-1', complexId, 'u-super', 'Joel Solis', 'account_initialized', 'profile', 'u-super', JSON.stringify({ email: 'joelsolis17900@gmail.com' }), now]
    );

    save();
  }

  const superAdminEmail = 'joelsolis17900@gmail.com';
  const superAdminPassword = 'superadmin123';

  const queryRows = <T = any>(sql: string, params: any[] = []): T[] => {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  };

  const existingSuperAdmin = queryRows<any>(
    `SELECT * FROM profiles WHERE role = ? AND (email = ? OR email = ?) LIMIT 1`,
    ['super_admin', superAdminEmail, 'superadmin@conjuntos.app']
  );

  if (existingSuperAdmin.length > 0) {
    const target = existingSuperAdmin[0];
    const needsUpdate = target.email !== superAdminEmail || target.password !== superAdminPassword || target.name !== 'Joel Solis';
    if (needsUpdate) {
      db.run(
        `UPDATE profiles SET name = ?, email = ?, password = ? WHERE id = ?`,
        ['Joel Solis', superAdminEmail, superAdminPassword, target.id]
      );
    }
  } else {
    const existingAdminByEmail = queryRows<any>('SELECT * FROM profiles WHERE email = ? LIMIT 1', [superAdminEmail]);
    if (existingAdminByEmail.length > 0) {
      db.run(
        `UPDATE profiles SET role = ?, name = ?, password = ? WHERE id = ?`,
        ['super_admin', 'Joel Solis', superAdminPassword, existingAdminByEmail[0].id]
      );
    } else {
      db.run(
        `INSERT OR REPLACE INTO profiles (id, name, email, password, role, complex_id, apartment, phone, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['u-super', 'Joel Solis', superAdminEmail, superAdminPassword, 'super_admin', null, null, '+57 300 000 0000', 'active', new Date().toISOString()]
      );
    }
  }

  save();

  const service: DatabaseService = {
    query: <T = any>(sql: string, params: any[] = []): T[] => {
      const stmt = db.prepare(sql);
      if (params.length > 0) {
        stmt.bind(params);
      }
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as unknown as T);
      }
      stmt.free();
      return results;
    },
    run: (sql: string, params: any[] = []) => {
      db.run(sql, params);
      save();
      return { changes: db.getRowsModified() };
    },
    save
  };

  dbInstance = service;
  return service;
}
