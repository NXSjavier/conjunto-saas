import { supabase } from './supabaseClient';
import { uploadProfilePhoto } from './uploadPhoto';

// Helpers
const genId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

// --- AUTH ---
export async function loginDirect(email, password) {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError || !authData.user) throw new Error(authError?.message || 'Credenciales inválidas');

  const { data: user, error } = await supabase
    .from('profiles')
    .select('id, name, email, role, complex_id, apartment, phone, status, face_photo, fcm_token, created_at')
    .eq('auth_user_id', authData.user.id)
    .single();
  if (error || !user) throw new Error('Perfil de usuario no encontrado');
  if (user.status === 'blocked') throw new Error('Tu cuenta ha sido suspendida.');
  if (user.status === 'pending') throw new Error('Tu cuenta está pendiente de aprobación.');

  let complex = null;
  if (user.complex_id) {
    const { data: c } = await supabase.from('residential_complexes').select('*').eq('id', user.complex_id).single();
    complex = c || null;
  }
  return { user, complex, rawUser: user };
}

export async function registerWithCodeDirect({ name, email, password, complexCode, apartment, phone }) {
  if (!name || !email || !password || !complexCode) throw new Error('Todos los campos son obligatorios');
  const { data: complexes } = await supabase.from('residential_complexes').select('*').ilike('code', complexCode.trim());
  if (!complexes || complexes.length === 0) throw new Error('Código de conjunto no encontrado');
  const complex = complexes[0];
  if (complex.status === 'blocked') throw new Error('Conjunto inactivo');

  const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (existing) throw new Error('Email ya registrado');

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError || !authData.user) throw new Error(authError?.message || 'No se pudo crear la cuenta');

  const userId = genId('u');
  const payload = {
    id: userId, auth_user_id: authData.user.id, name, email: email.trim().toLowerCase(),
    role: 'resident', complex_id: complex.id,
    apartment: apartment || 'Pendiente', phone: phone || '', status: 'active',
    created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').insert(payload);
  if (error) throw new Error(error.message);

  await supabase.from('notifications').insert({
    id: genId('notif'), user_id: 'u-super',
    title: 'Nuevo Residente', message: `${name} se registró en ${complex.name}`,
    read: 0, created_at: new Date().toISOString(),
  }).then(() => {}, () => {});

  return { user: payload, complex };
}

export async function registerWithoutCodeDirect({ name, email, password, complexId, apartment, phone, facePhoto }) {
  if (!name || !email || !password || !complexId) throw new Error('Campos obligatorios');
  const { data: complex } = await supabase.from('residential_complexes').select('*').eq('id', complexId).single();
  if (!complex) throw new Error('Conjunto no encontrado');

  const { data: existing } = await supabase.from('profiles').select('id').eq('email', email.trim().toLowerCase()).maybeSingle();
  if (existing) throw new Error('Email ya registrado');

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
  });
  if (authError || !authData.user) throw new Error(authError?.message || 'No se pudo crear la cuenta');

  const userId = genId('u');
  const photoUrl = facePhoto instanceof File ? await uploadProfilePhoto(facePhoto, userId) : (typeof facePhoto === 'string' && facePhoto?.startsWith?.('data:') ? null : facePhoto || null);
  const payload = {
    id: userId, auth_user_id: authData.user.id, name, email: email.trim().toLowerCase(),
    role: 'resident', complex_id: complex.id,
    apartment: apartment || 'Por asignar', phone: phone || '', status: 'pending',
    face_photo: photoUrl, created_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('profiles').insert(payload);
  if (error) throw new Error(error.message);

  const { data: adminUsers } = await supabase.from('profiles').select('id, role, complex_id').in('role', ['admin', 'super_admin']);
  const recipients = (adminUsers || []).filter((u) => u.role === 'super_admin' || u.complex_id === complex.id);
  if (recipients.length > 0) {
    const notifs = recipients.map((admin) => ({
      id: genId('notif'), user_id: admin.id,
      title: 'Solicitud de Aprobación',
      message: `${name} solicita acceso a ${apartment || 'unidad'} en ${complex.name}`,
      read: 0, created_at: new Date().toISOString(),
    }));
    await supabase.from('notifications').insert(notifs).then(() => {}, () => {});
  }
  return { message: 'Solicitud enviada. Tu cuenta está en revisión.' };
}

export async function resetPasswordDirect(email, newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

// --- DATA ---
// Phase 1: Essential data (fast)
export async function fetchBootstrapDirect(complexId, userId, role) {
  const isGuest = !role || role === 'guest';
  const limit = 50;

  let complexesQuery = supabase.from('residential_complexes').select('*');
  if (role !== 'super_admin' && !isGuest && complexId) complexesQuery = complexesQuery.eq('id', complexId);
  else if (isGuest || role === 'super_admin') complexesQuery = complexesQuery.eq('status', 'active');
  const { data: complexes } = await complexesQuery.order('name');

  let usersQuery = supabase.from('profiles').select('id, name, email, role, complex_id, apartment, phone, status, created_at');
  if (role !== 'super_admin' && complexId) usersQuery = usersQuery.eq('complex_id', complexId);
  const { data: users } = await usersQuery;

  let guardsQuery = supabase.from('profiles').select('id, name, email, phone, complex_id, status, created_at').eq('role', 'guard');
  if (complexId && role !== 'super_admin') guardsQuery = guardsQuery.eq('complex_id', complexId);

  let announcementsQuery = supabase.from('announcements').select('*');
  let apartmentsQuery = supabase.from('apartments').select('*');
  if (complexId && role !== 'super_admin') {
    announcementsQuery = announcementsQuery.eq('complex_id', complexId);
    apartmentsQuery = apartmentsQuery.eq('complex_id', complexId);
  }

  const [essentialRes] = await Promise.all([
    Promise.all([
      guardsQuery.order('created_at', { ascending: false }),
      announcementsQuery.order('created_at', { ascending: false }).limit(limit),
      apartmentsQuery.order('number').limit(limit),
    ]),
  ]);
  const [guardRes, annRes, aptRes] = essentialRes;

  let commentsQuery = supabase.from('announcement_comments').select('*');
  if (complexId && role !== 'super_admin') {
    const annIds = (annRes.data || []).map((a) => a.id);
    if (annIds.length > 0) commentsQuery = commentsQuery.in('announcement_id', annIds);
  }
  const { data: comments } = await commentsQuery.order('created_at').limit(limit);

  return {
    complexes: complexes || [],
    users: users || [],
    apartments: aptRes.data || [],
    guards: guardRes.data || [],
    announcements: annRes.data || [],
    comments: comments || [],
    incidents: [],
    reservations: [],
    visitors: [],
    audits: [],
    notifications: [],
  };
}

// Phase 2: Heavy data (visitors, incidents, reservations, audits, notifications)
export async function fetchBootstrapHeavy(complexId, userId, role) {
  const limit = 50;
  let visitorsQuery = supabase.from('visitors').select('*');
  let incidentsQuery = supabase.from('incidents').select('*');
  let reservationsQuery = supabase.from('reservations').select('*');
  let auditsQuery = supabase.from('audit_logs').select('*');

  if (complexId && role !== 'super_admin') {
    visitorsQuery = visitorsQuery.eq('complex_id', complexId);
    incidentsQuery = incidentsQuery.eq('complex_id', complexId);
    reservationsQuery = reservationsQuery.eq('complex_id', complexId);
    auditsQuery = auditsQuery.eq('complex_id', complexId);
  }

  const [visRes, incRes, resRes, audRes] = await Promise.all([
    visitorsQuery.order('created_at', { ascending: false }).limit(limit),
    incidentsQuery.order('created_at', { ascending: false }).limit(limit),
    reservationsQuery.order('reservation_date', { ascending: false }).limit(limit),
    auditsQuery.order('created_at', { ascending: false }).limit(limit),
  ]);

  let notifications = [];
  if (userId) {
    const { data: n } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
    notifications = n || [];
  }

  return {
    visitors: visRes.data || [],
    incidents: incRes.data || [],
    reservations: resRes.data || [],
    audits: audRes.data || [],
    notifications,
  };
}

// Load face photos for specific users (lazy)
export async function fetchUserPhotos(userIds) {
  if (!userIds || userIds.length === 0) return {};
  const { data } = await supabase.from('profiles').select('id, face_photo').in('id', userIds);
  const map = {};
  (data || []).forEach((u) => { if (u.face_photo) map[u.id] = u.face_photo; });
  return map;
}

export async function fetchComplexesDirect() {
  const { data } = await supabase.from('residential_complexes').select('id, name, code, address, plan, status, created_at').eq('status', 'active').order('name');
  return data || [];
}
