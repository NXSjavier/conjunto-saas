import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { supabase } from './server/supabase.js';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'https://conjuntos-app-pwa.vercel.app' || origin?.endsWith('.vercel.app')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  const server = http.createServer(app);

  // WebSocket
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'CONNECTED', message: 'Conexión WebSocket establecida' }));
    ws.on('message', (messageRaw) => {
      try {
        const message = JSON.parse(messageRaw.toString());
        if (message.type === 'PING') ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } catch (err) {}
    });
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  function broadcast(payload: any) {
    const raw = JSON.stringify(payload);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) client.send(raw);
    }
  }

  // --- API ROUTES ---

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), clients: clients.size });
  });

  // Public complexes
  app.get('/api/complexes', async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('residential_complexes')
        .select('id, name, code, address, plan, status, created_at')
        .eq('status', 'active')
        .order('name');

      if (error) {
        return res.status(503).json({
          error: 'No se pudo conectar con Supabase. Verifica la URL y la clave del proyecto.',
          details: error.message,
        });
      }

      res.json(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(503).json({
        error: 'No se pudo conectar con Supabase.',
        details: message,
      });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (authError || !authData.user) return res.status(401).json({ error: 'Credenciales inválidas. Verifica tu correo y contraseña.' });
      const { data: user, error } = await supabase.from('profiles').select('id, name, email, role, complex_id, apartment, phone, status, face_photo, fcm_token, created_at').eq('auth_user_id', authData.user.id).single();
      if (error || !user) return res.status(401).json({ error: 'Perfil de usuario no encontrado.' });
      if (user.status === 'blocked') return res.status(403).json({ error: 'Tu cuenta ha sido suspendida.' });
      if (user.status === 'pending') return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación.' });

      let complex = null;
      if (user.complex_id) {
        const { data: c } = await supabase.from('residential_complexes').select('*').eq('id', user.complex_id).single();
        complex = c;
      }

      res.json({ user, complex });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(503).json({
        error: 'Falló la conexión con Supabase durante el login.',
        details: message,
      });
    }
  });

  // Register with code
  app.post('/api/auth/register-with-code', async (req, res) => {
    const { name, email, password, apartment, phone } = req.body;
    const complexCode = req.body.complexCode || req.body.complex_code || '';
    if (!name || !email || !password || !complexCode) return res.status(400).json({ error: 'Todos los campos son obligatorios' });

    const { data: complexes } = await supabase.from('residential_complexes').select('*').ilike('code', complexCode.trim());
    if (!complexes || complexes.length === 0) return res.status(404).json({ error: 'Código de conjunto no encontrado' });
    const complex = complexes[0];
    if (complex.status === 'blocked') return res.status(403).json({ error: 'Conjunto inactivo' });

    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Email ya registrado' });

    const userId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId, name, email: email.trim().toLowerCase(), password,
      role: 'resident', complex_id: complex.id,
      apartment: apartment || 'Pendiente', phone: phone || '', status: 'active'
    });
    if (insertError) return res.status(500).json({ error: insertError.message });

    await supabase.from('notifications').insert({
      id: `notif-${Date.now()}`, user_id: 'u-admin',
      title: 'Nuevo Residente', message: `${name} se registró en ${complex.name}`
    });

    const safeUser = { id: userId, name, email: email.trim().toLowerCase(), role: 'resident', complex_id: complex.id, apartment: apartment || 'Pendiente', phone: phone || '', status: 'active' };
    broadcast({ type: 'USER_NEW', data: safeUser });
    res.status(201).json({ user: safeUser, complex });
  });

  // Register without code
  app.post('/api/auth/register-no-code', async (req, res) => {
    const { name, email, password, apartment, phone } = req.body;
    const complexId = req.body.complexId || req.body.complex_id || '';
    const facePhoto = req.body.facePhoto || req.body.face_photo || null;
    if (!name || !email || !password || !complexId) return res.status(400).json({ error: 'Campos obligatorios' });

    const { data: complex } = await supabase.from('residential_complexes').select('*').eq('id', complexId).single();
    if (!complex) return res.status(404).json({ error: 'Conjunto no encontrado' });

    const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).single();
    if (existing) return res.status(409).json({ error: 'Email ya registrado' });

    const userId = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const safeUser = {
      id: userId,
      name,
      email: email.trim().toLowerCase(),
      password,
      role: 'resident',
      complex_id: complex.id,
      apartment: apartment || 'Por asignar',
      phone: phone || '',
      status: 'pending',
      face_photo: facePhoto,
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('profiles').insert(safeUser);
    if (insertError) return res.status(500).json({ error: insertError.message });

    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('id, role, complex_id')
      .in('role', ['admin', 'super_admin']);

    const recipients = (adminUsers || []).filter((user) => {
      if (user.role === 'super_admin') return true;
      return user.complex_id === complex.id;
    });

    if (recipients.length > 0) {
      const notifications = recipients.map((admin) => ({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: admin.id,
        title: 'Solicitud de Aprobación',
        message: `${name} solicita acceso a ${apartment || 'unidad'} en ${complex.name}`,
        read: 0,
        created_at: new Date().toISOString(),
      }));

      await supabase.from('notifications').insert(notifications);
    }

    broadcast({ type: 'USER_PENDING_APPROVAL', data: safeUser });
    broadcast({ type: 'USER_NEW', data: safeUser });

    res.status(201).json({ message: 'Solicitud enviada. Tu cuenta está en revisión.' });
  });

  // Password reset
  app.post('/api/auth/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email y contraseña requeridos' });
    const { error } = await supabase.from('profiles').update({ password: newPassword }).eq('email', email.trim().toLowerCase());
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Contraseña actualizada' });
  });

  // Bootstrap
  app.get('/api/data/bootstrap', async (req, res) => {
    const complexId = req.query.complexId as string;
    const userId = req.query.userId as string;
    const role = req.query.role as string;

    const isGuest = !role || role === 'guest';

    let complexesQuery = supabase.from('residential_complexes').select('*');
    if (role !== 'super_admin' && !isGuest && complexId) {
      complexesQuery = complexesQuery.eq('id', complexId);
    } else if (isGuest || role === 'super_admin') {
      complexesQuery = complexesQuery.eq('status', 'active');
    }
    const { data: complexes } = await complexesQuery.order('name');

    let usersQuery = supabase.from('profiles').select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at');
    if (role !== 'super_admin' && complexId) usersQuery = usersQuery.eq('complex_id', complexId);
    const { data: users } = await usersQuery;

    let apartmentsQuery = supabase.from('apartments').select('*');
    let guardsQuery = supabase.from('profiles').select('id, name, email, phone, complex_id, status, created_at').eq('role', 'guard');
    let announcementsQuery = supabase.from('announcements').select('*');
    let incidentsQuery = supabase.from('incidents').select('*');
    let reservationsQuery = supabase.from('reservations').select('*');
    let visitorsQuery = supabase.from('visitors').select('*');
    let auditsQuery = supabase.from('audit_logs').select('*');

    if (complexId && role !== 'super_admin') {
      apartmentsQuery = apartmentsQuery.eq('complex_id', complexId);
      guardsQuery = guardsQuery.eq('complex_id', complexId);
      announcementsQuery = announcementsQuery.eq('complex_id', complexId);
      incidentsQuery = incidentsQuery.eq('complex_id', complexId);
      reservationsQuery = reservationsQuery.eq('complex_id', complexId);
      visitorsQuery = visitorsQuery.eq('complex_id', complexId);
      auditsQuery = auditsQuery.eq('complex_id', complexId);
    }

    const [aptResult, guardResult, annResult, incResult, resResult, visResult, audResult] = await Promise.all([
      apartmentsQuery.order('number'),
      guardsQuery.order('created_at', { ascending: false }),
      announcementsQuery.order('created_at', { ascending: false }),
      incidentsQuery.order('created_at', { ascending: false }),
      reservationsQuery.order('reservation_date', { ascending: false }),
      visitorsQuery.order('created_at', { ascending: false }),
      auditsQuery.order('created_at', { ascending: false }).limit(100),
    ]);

    let commentsQuery = supabase.from('announcement_comments').select('*');
    if (complexId && role !== 'super_admin') {
      const annIds = (annResult.data || []).map(a => a.id);
      if (annIds.length > 0) commentsQuery = commentsQuery.in('announcement_id', annIds);
    }
    const { data: comments } = await commentsQuery.order('created_at');

    let notifications: any[] = [];
    if (userId) {
      const { data: n } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      notifications = n || [];
    }

    res.json({
      complexes: complexes || [],
      users: users || [],
      apartments: aptResult.data || [],
      guards: guardResult.data || [],
      announcements: annResult.data || [],
      comments: comments || [],
      incidents: incResult.data || [],
      reservations: resResult.data || [],
      visitors: visResult.data || [],
      audits: audResult.data || [],
      notifications,
    });
  });

  // --- CRUD ---

  // Complexes
  app.post('/api/complexes', async (req, res) => {
    const { name, code, address, plan, subscription_status, subscription_expiry, status } = req.body;
    const id = `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const expiry = subscription_expiry || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('residential_complexes').insert({
      id, name, code, address: address || '', plan: plan || 'pro',
      subscription_status: subscription_status || 'active', subscription_expiry: expiry, status: status || 'active'
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'COMPLEX_CREATED', data });
    res.status(201).json(data);
  });

  app.put('/api/complexes/:id', async (req, res) => {
    const { id } = req.params;
    const { name, code, address, plan, subscription_status, subscription_expiry, status } = req.body;
    const { data, error } = await supabase.from('residential_complexes').update({
      name, code, address, plan, subscription_status, subscription_expiry, status
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'COMPLEX_UPDATED', data });
    res.json(data);
  });

  app.delete('/api/complexes/:id', async (req, res) => {
    const { id } = req.params;
    await supabase.from('residential_complexes').delete().eq('id', id);
    broadcast({ type: 'COMPLEX_DELETED', data: { id } });
    res.json({ success: true, id });
  });

  // Users
  app.put('/api/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, apartment } = req.body;
    const update: any = { status };
    if (apartment) update.apartment = apartment;
    const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at').single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'USER_UPDATED', data });
    res.json(data);
  });

  app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, apartment, phone } = req.body;
    const update: any = {};
    if (apartment !== undefined) update.apartment = apartment;
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email.trim().toLowerCase();
    if (phone !== undefined) update.phone = phone;
    const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at').single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'USER_UPDATED', data });
    res.json(data);
  });

  app.put('/api/users/:id/password', async (req, res) => {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

    const { data: user } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (currentPassword && user.password !== currentPassword) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    await supabase.from('profiles').update({ password: newPassword }).eq('id', id);
    res.json({ success: true, message: 'Contraseña actualizada' });
  });

  app.post('/api/users', async (req, res) => {
    const { name, email, password, role, complex_id, apartment, phone, status } = req.body;
    const id = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const normalizedEmail = email.trim().toLowerCase();
    const authResult = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password: password || '123456',
      email_confirm: true,
    });
    if (authResult.error || !authResult.data.user) return res.status(409).json({ error: authResult.error?.message || 'No se pudo crear la cuenta de autenticación' });
    const { data, error } = await supabase.from('profiles').insert({
      id, auth_user_id: authResult.data.user.id, name, email: normalizedEmail,
      role, complex_id: complex_id || null, apartment: apartment || null,
      phone: phone || null, status: status || 'active', password: null
    }).select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at').single();
    if (error) {
      await supabase.auth.admin.deleteUser(authResult.data.user.id);
      return res.status(500).json({ error: error.message });
    }
    broadcast({ type: 'USER_CREATED', data });
    res.status(201).json(data);
  });

  // User purge
  app.delete('/api/users/:id/purge', async (req, res) => {
    const { id } = req.params;
    const { data: user } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    await supabase.from('visitors').delete().eq('resident_id', id);
    await supabase.from('reservations').delete().eq('resident_id', id);
    await supabase.from('incidents').delete().eq('reported_by', id);
    await supabase.from('announcement_comments').delete().eq('author_id', id);
    await supabase.from('notifications').delete().eq('user_id', id);
    await supabase.from('apartments').update({ resident_id: null, status: 'available' }).eq('resident_id', id);
    await supabase.from('profiles').delete().eq('id', id);

    const auditId = `aud-${Date.now()}`;
    await supabase.from('audit_logs').insert({
      id: auditId, complex_id: user.complex_id || 'system',
      user_id: req.body.operatorId || 'super_admin', user_name: req.body.operatorName || 'Super Admin',
      action: 'purge_user', entity: 'profiles', entity_id: id,
      details: JSON.stringify({ email: user.email, name: user.name })
    });

    broadcast({ type: 'USER_PURGED', data: { id } });
    res.json({ success: true });
  });

  // Apartments
  app.post('/api/apartments', async (req, res) => {
    const { complex_id, number, floor, status, resident_id } = req.body;
    const id = `apt-${Date.now()}`;
    const { data, error } = await supabase.from('apartments').insert({
      id, complex_id, number, floor: floor || 1, status: status || 'available', resident_id: resident_id || null
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'APARTMENT_CREATED', data });
    res.status(201).json(data);
  });

  app.put('/api/apartments/:id', async (req, res) => {
    const { id } = req.params;
    const { status, resident_id, number, floor } = req.body;
    const { data, error } = await supabase.from('apartments').update({
      status, resident_id: resident_id || null, number, floor
    }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'APARTMENT_UPDATED', data });
    res.json(data);
  });

  app.delete('/api/apartments/:id', async (req, res) => {
    const { id } = req.params;
    await supabase.from('apartments').delete().eq('id', id);
    broadcast({ type: 'APARTMENT_DELETED', data: { id } });
    res.json({ success: true, id });
  });

  // Guards
  app.post('/api/guards', async (req, res) => {
    const { complex_id, name, email, phone, password } = req.body;
    const id = `u-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tempPassword = password || 'guard123';
    const normalizedEmail = email.trim().toLowerCase();
    const authResult = await supabase.auth.admin.createUser({ email: normalizedEmail, password: tempPassword, email_confirm: true });
    if (authResult.error || !authResult.data.user) return res.status(409).json({ error: authResult.error?.message || 'No se pudo crear la cuenta de autenticación' });
    const { data, error } = await supabase.from('profiles').insert({
      id, auth_user_id: authResult.data.user.id, name, email: normalizedEmail, password: null,
      role: 'guard', complex_id, phone: phone || null, status: 'active'
    }).select('id, name, email, phone, complex_id, status, created_at').single();
    if (error) { await supabase.auth.admin.deleteUser(authResult.data.user.id); return res.status(500).json({ error: error.message }); }
    broadcast({ type: 'GUARD_CREATED', data });
    res.status(201).json({ ...data, tempPassword });
  });

  app.delete('/api/guards/:id', async (req, res) => {
    const { id } = req.params;
    await supabase.from('profiles').delete().eq('id', id).eq('role', 'guard');
    broadcast({ type: 'GUARD_DELETED', data: { id } });
    res.json({ success: true, id });
  });

  // Visitors
  app.post('/api/visitors', async (req, res) => {
    const { complex_id, code, visitor_name, purpose, destination_apartment, resident_name, resident_id, status } = req.body;
    const id = `vis-${Date.now()}`;
    const formattedCode = code || `VIS-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data, error } = await supabase.from('visitors').insert({
      id, complex_id, code: formattedCode, visitor_name, purpose: purpose || '',
      destination_apartment: destination_apartment || '', resident_name: resident_name || '',
      resident_id: resident_id || null, status: status || 'registered'
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'VISITOR_CREATED', data });
    res.status(201).json(data);
  });

  app.put('/api/visitors/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();
    const update: any = { status };
    if (status === 'in') update.checked_in_at = now;
    if (status === 'out') update.checked_out_at = now;

    const { data: visitor, error } = await supabase.from('visitors').update(update).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (visitor?.resident_id) {
      const title = status === 'in' ? 'Visitante Ingresó' : status === 'out' ? 'Visitante Salió' : 'Pase Actualizado';
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`, user_id: visitor.resident_id,
        title, message: `${visitor.visitor_name} (${visitor.code}) → ${status.toUpperCase()}`
      });
    }

    broadcast({ type: 'VISITOR_STATUS_UPDATED', data: visitor });
    res.json(visitor);
  });

  // Announcements
  app.post('/api/announcements', async (req, res) => {
    const { complex_id, title, content, author_name, author_id } = req.body;
    const id = `ann-${Date.now()}`;
    const { data, error } = await supabase.from('announcements').insert({
      id, complex_id, title, content, author_name: author_name || 'Administración', author_id: author_id || null
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'ANNOUNCEMENT_CREATED', data });
    res.status(201).json(data);
  });

  app.delete('/api/announcements/:id', async (req, res) => {
    const { id } = req.params;
    await supabase.from('announcements').delete().eq('id', id);
    broadcast({ type: 'ANNOUNCEMENT_DELETED', data: { id } });
    res.json({ success: true, id });
  });

  app.post('/api/announcements/:id/comments', async (req, res) => {
    const { id: announcement_id } = req.params;
    const { author_name, author_id, content } = req.body;
    const id = `comm-${Date.now()}`;
    const { data, error } = await supabase.from('announcement_comments').insert({
      id, announcement_id, author_name, author_id: author_id || null, content
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'COMMENT_CREATED', data });
    res.status(201).json(data);
  });

  app.delete('/api/announcements/comments/:commentId', async (req, res) => {
    const { commentId } = req.params;
    await supabase.from('announcement_comments').delete().eq('id', commentId);
    broadcast({ type: 'COMMENT_DELETED', data: { id: commentId } });
    res.json({ success: true, id: commentId });
  });

  // Incidents
  app.post('/api/incidents', async (req, res) => {
    const { complex_id, title, description, priority, status, reported_by, apartment, attachments } = req.body;
    const id = `inc-${Date.now()}`;
    const { data, error } = await supabase.from('incidents').insert({
      id, complex_id, title, description: description || '', priority: priority || 'medium',
      status: status || 'open', reported_by: reported_by || null, apartment: apartment || '',
      attachments: attachments ? JSON.stringify(attachments) : null
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'INCIDENT_CREATED', data });
    res.status(201).json(data);
  });

  app.put('/api/incidents/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { data, error } = await supabase.from('incidents').update({ status }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'INCIDENT_UPDATED', data });
    res.json(data);
  });

  // Reservations
  app.post('/api/reservations', async (req, res) => {
    const { complex_id, area_name, reservation_date, start_time, end_time, resident_id, resident_name, apartment, status } = req.body;

    if (!complex_id || !area_name || !reservation_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Faltan datos para crear la reserva.' });
    }

    const { data: complex, error: complexError } = await supabase
      .from('residential_complexes')
      .select('plan')
      .eq('id', complex_id)
      .single();

    if (complexError || !complex) {
      return res.status(400).json({ error: 'No se pudo validar el complejo de la reserva.' });
    }

    const plan = complex.plan || 'free';
    const start = Number(start_time.replace(':', ''));
    const end = Number(end_time.replace(':', ''));

    const { data: activeReservations, error: activeError } = await supabase
      .from('reservations')
      .select('id, area_name, reservation_date, start_time, end_time, status')
      .eq('complex_id', complex_id)
      .in('status', ['pending', 'approved']);

    if (activeError) {
      return res.status(500).json({ error: activeError.message });
    }

    const activeCount = activeReservations?.length || 0;

    if (plan === 'free' && activeCount >= 1) {
      return res.status(409).json({ error: 'El plan Gratuito solo permite 1 reserva activa a la vez. Espere a que se libere el espacio.' });
    }

    if (plan === 'pro' && activeCount >= 3) {
      return res.status(409).json({ error: 'El plan Pro solo permite 3 reservas activas a la vez. Elige otra franja o espera a que se libere un espacio.' });
    }

    const { data: conflicts, error: conflictError } = await supabase
      .from('reservations')
      .select('*')
      .eq('complex_id', complex_id)
      .eq('area_name', area_name)
      .eq('reservation_date', reservation_date)
      .in('status', ['pending', 'approved']);

    if (conflictError) {
      return res.status(500).json({ error: conflictError.message });
    }

    const overlaps = (conflicts || []).filter((item) => {
      if (!item.start_time || !item.end_time) return false;
      const existingStart = Number(String(item.start_time).replace(':', ''));
      const existingEnd = Number(String(item.end_time).replace(':', ''));
      return !(end <= existingStart || start >= existingEnd);
    });

    if (plan === 'free' && overlaps.length >= 1) {
      return res.status(409).json({ error: 'Este horario ya está ocupado para esta área. Elige otro día o horario.' });
    }

    if (plan === 'pro' && overlaps.length >= 3) {
      return res.status(409).json({ error: 'El plan Pro admite hasta 3 reservas activas en ese mismo horario. Elige otra franja o día.' });
    }

    if (plan === 'enterprise' && overlaps.length >= 1) {
      return res.status(409).json({ error: 'Ese horario ya está ocupado. Elige otro día o cambia la hora.' });
    }

    const id = `res-${Date.now()}`;
    const { data, error } = await supabase.from('reservations').insert({
      id, complex_id, area_name, reservation_date, start_time, end_time,
      resident_id: resident_id || null, resident_name: resident_name || '',
      apartment: apartment || '', status: status || 'pending'
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    broadcast({ type: 'RESERVATION_CREATED', data });
    res.status(201).json(data);
  });

  app.put('/api/reservations/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { data: reservation, error } = await supabase.from('reservations').update({ status }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (reservation?.resident_id) {
      const title = status === 'approved' ? 'Reserva Aprobada' : status === 'rejected' ? 'Reserva Rechazada' : 'Reserva Actualizada';
      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`, user_id: reservation.resident_id,
        title, message: `Reserva "${reservation.area_name}" → ${status}`
      });
    }

    broadcast({ type: 'RESERVATION_UPDATED', data: reservation });
    res.json(reservation);
  });

  // Notifications
  app.put('/api/notifications/read-all', async (req, res) => {
    const { userId } = req.body;
    await supabase.from('notifications').update({ read: 1 }).eq('user_id', userId);
    res.json({ success: true });
  });

  app.delete('/api/notifications/clear', async (req, res) => {
    const { userId } = req.body;
    await supabase.from('notifications').delete().eq('user_id', userId);
    res.json({ success: true });
  });

  // Error logs
  app.post('/api/logs', async (req, res) => {
    const { level, message, stack, context, url, user_agent, user_id } = req.body;
    const id = `log-${Date.now()}`;
    await supabase.from('audit_logs').insert({
      id, level: level || 'ERROR', message: message || 'Error',
      stack: stack || '', details: context ? JSON.stringify(context) : null,
      url: url || '', user_agent: user_agent || '', user_id: user_id || null
    });
    res.status(201).json({ id });
  });

  // Vite / Static
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Conjuntos App (Supabase) running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
