import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { PLAN_LIMITS } from '../types.js';
import { useAuth } from './AuthContext';
import { playNotificationBeep as playNotificationSound, playSuccessChime, playTrashWhoosh } from '../lib/sound';
import { notifyWhenHidden } from '../lib/appNotifications';
import { generateUserDeletionCertificatePDF, generateSubscriptionReceiptPDF } from '../lib/pdf';
import { getApiBaseUrl, isStandalone } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { fetchBootstrapDirect, fetchBootstrapHeavy, fetchComplexesDirect } from '../lib/supabaseRepo';
import { sendPushToUser, sendPushToMany } from '../lib/pushNotifications';
import { setLauncherBadge } from '../lib/badge';
import { saveCachedAnnouncements } from '../lib/offlineCache';

const DataContext = createContext(undefined);
const apiBase = getApiBaseUrl();
const apiFetch = (path, options = {}) => fetch(`${apiBase}${path}`, options);
const genId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
const playNotificationBeep = (title, body) => {
  playNotificationSound();
  notifyWhenHidden(title || 'Residex', body || 'Tienes una actualización nueva.');
};

/** Insertar notificación en BD (silencioso, no bloquea UI) */
const insertNotification = (userId, title, message, type) => {
  if (!userId || !title) return;
  supabase.from('notifications').insert({
    id: genId('notif'),
    user_id: userId,
    title,
    message: message || '',
    type: type || 'default',
    read: 0,
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {});
};

export const DataProvider = ({ children }) => {
  const { currentUser, currentComplex, updateComplexSession } = useAuth();

  // Refs para evitar stale closures en suscripciones realtime
  const usersRef = useRef([]);
  const currentUserRef = useRef(null);

  const [complexes, setComplexes] = useState([]);
  const [users, setUsers] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [guards, setGuards] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [comments, setComments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [audits, setAudits] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [dailyUsage, setDailyUsage] = useState([]);

  const standalone = isStandalone() || !apiBase;

  // Fecha local YYYY-MM-DD (para usage_log.day)
  const localDay = () => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  };

  // ✅ Registra 1 sesión del día en usage_log (idempotente por usuario/día)
  const logDailyUsage = useCallback(async (user) => {
    if (!user?.id) return;
    try {
      const flag = `usage_logged_${user.id}_${localDay()}`;
      if (sessionStorage.getItem(flag)) return;
      const { data: existing, error: selErr } = await supabase
        .from('usage_log')
        .select('id, sessions')
        .eq('auth_user_id', user.auth_user_id || user.id)
        .eq('day', localDay())
        .maybeSingle();
      if (selErr) throw selErr;
      if (existing?.id) {
        await supabase.from('usage_log').update({
          last_seen: new Date().toISOString(),
          sessions: (existing.sessions || 1) + 1,
          complex_id: user.complex_id || null,
          role: user.role || 'resident',
        }).eq('id', existing.id);
      } else {
        await supabase.from('usage_log').insert({
          auth_user_id: user.auth_user_id || user.id,
          profile_id: user.id,
          complex_id: user.complex_id || null,
          role: user.role || 'resident',
          day: localDay(),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          sessions: 1,
        });
      }
      try { sessionStorage.setItem(flag, '1'); } catch {}
    } catch (err) {
      console.warn('[UsoDiario] No se pudo registrar sesión:', err?.message || err);
    }
  }, []);

  // ✅ Carga uso de los últimos 7 días (solo super_admin)
  const fetchDailyUsage = useCallback(async (role) => {
    if (role !== 'super_admin') return;
    try {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('usage_log')
        .select('*')
        .gte('day', from)
        .order('day', { ascending: true })
        .limit(2000);
      if (!error) setDailyUsage(data || []);
    } catch (err) {
      console.warn('[UsoDiario] Error cargando uso:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'super_admin') fetchDailyUsage('super_admin');
    else setDailyUsage([]);
  }, [currentUser?.id, currentUser?.role, fetchDailyUsage]);

  // ✅ Badge del launcher = cantidad de notificaciones no leídas
  useEffect(() => {
    const unread = notifications.filter((n) => !n.read).length;
    setLauncherBadge(unread);
  }, [notifications]);

  // ✅ Cache offline: guarda últimos comunicados para lectura sin conexión
  useEffect(() => {
    if (announcements.length > 0) {
      saveCachedAnnouncements(currentUser?.complex_id, announcements);
    }
  }, [announcements, currentUser?.complex_id]);

  // ✅ FUNCIÓN PARA OBTENER ADMINS DE UN COMPLEJO (robusta)
  const getAdminIdsForComplex = useCallback(async (complexId) => {
    try {
      // Primero intentar desde el estado
      let adminIds = users
        .filter((u) => u.role === 'admin' && u.complex_id === complexId && u.status === 'active')
        .map((u) => u.id);
      
      // Si no hay admins en el estado, consultar Supabase directamente
      if (adminIds.length === 0) {
        console.log('📡 Buscando admins en Supabase para complejo:', complexId);
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('complex_id', complexId)
          .eq('status', 'active');
        
        if (!error && data) {
          adminIds = data.map((u) => u.id);
          console.log('✅ Admins encontrados en Supabase:', adminIds.length);
        }
      }
      
      console.log('👥 Admins para notificación:', adminIds);
      return adminIds;
    } catch (error) {
      console.error('❌ Error obteniendo admins:', error);
      return [];
    }
  }, [users]);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (standalone) {
        if (currentUser) {
          const data = await fetchBootstrapDirect(currentUser.complex_id || '', currentUser.id, currentUser.role);
          setComplexes(data.complexes || []);
          setUsers(data.users || []);
          setApartments(data.apartments || []);
          setGuards(data.guards || []);
          setAnnouncements(data.announcements || []);
          setComments(data.comments || []);
          setIsLoading(false);
          fetchBootstrapHeavy(currentUser.complex_id || '', currentUser.id, currentUser.role).then((heavy) => {
            setIncidents(heavy.incidents || []);
            setReservations(heavy.reservations || []);
            setVisitors(heavy.visitors || []);
            setAudits(heavy.audits || []);
            setNotifications(heavy.notifications || []);
          }).catch(() => {});
          return;
        } else {
          const list = await fetchComplexesDirect();
          setComplexes(list);
          setUsers([]); setApartments([]); setGuards([]); setAnnouncements([]); setComments([]); setIncidents([]); setReservations([]); setVisitors([]); setAudits([]); setNotifications([]);
        }
        return;
      }
      // Modo web: intenta bootstrap del servidor, fallback a Supabase directo
      if (currentUser) {
        try {
          const params = new URLSearchParams({ complexId: currentUser.complex_id || '', userId: currentUser.id, role: currentUser.role || 'resident' });
          const res = await apiFetch(`/api/data/bootstrap?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setComplexes(data.complexes || []);
            setUsers(data.users || []);
            setApartments(data.apartments || []);
            setGuards(data.guards || []);
            setAnnouncements(data.announcements || []);
            setComments(data.comments || []);
            setIncidents(data.incidents || []);
            setReservations(data.reservations || []);
            setVisitors(data.visitors || []);
            setAudits(data.audits || []);
            setNotifications(data.notifications || []);
            return;
          }
        } catch {}
        const data = await fetchBootstrapDirect(currentUser.complex_id || '', currentUser.id, currentUser.role);
        setComplexes(data.complexes || []);
        setUsers(data.users || []);
        setApartments(data.apartments || []);
        setGuards(data.guards || []);
        setAnnouncements(data.announcements || []);
        setComments(data.comments || []);
        setIsLoading(false);
        fetchBootstrapHeavy(currentUser.complex_id || '', currentUser.id, currentUser.role).then((heavy) => {
          setIncidents(heavy.incidents || []);
          setReservations(heavy.reservations || []);
          setVisitors(heavy.visitors || []);
          setAudits(heavy.audits || []);
          setNotifications(heavy.notifications || []);
        }).catch(() => {});
      } else {
        try {
          const res = await apiFetch('/api/complexes');
          if (res.ok) { setComplexes(await res.json()); } else throw new Error();
        } catch { setComplexes(await fetchComplexesDirect()); }
        setUsers([]); setApartments([]); setGuards([]); setAnnouncements([]); setComments([]); setIncidents([]); setReservations([]); setVisitors([]); setAudits([]); setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, standalone]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Refs sincronizados para evitar stale closures en callbacks realtime
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // Realtime: Supabase Realtime como fuente ÚNICA para web y móvil
  useEffect(() => {
    let channel;
    let retries = 0;
    const MAX_RETRIES = 5;

    let disposed = false;
    let reconnectTimer = null;

    const connect = () => {
      if (disposed) return;
      // Remover el canal previo antes de crear uno nuevo. Supabase deduplica
      // por nombre: reutilizar un canal ya suscrito rompe con
      // "cannot add postgres_changes callbacks ... after subscribe()".
      if (channel) {
        supabase.removeChannel(channel).catch(() => {});
        channel = null;
      }
      // Nombre único por conexión evita colisiones con canales viejos en cola de remoción
      channel = supabase.channel(`conjuntos-v3-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
        // ============================================
        // ✅ VISITORS - MEJORADO CON PUSH
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setVisitors((p) => [payload.new, ...p.filter((v) => v.id !== payload.new.id)]);
            playNotificationBeep('Nuevo Pase de Visita', `${payload.new.visitor_name} — Apt ${payload.new.destination_apartment || '?'}`);
            
            (async () => {
              try {
                const adminIds = await getAdminIdsForComplex(payload.new.complex_id);
                if (adminIds.length > 0) {
                  adminIds.forEach((uid) => insertNotification(uid, '🚪 Nuevo Pase de Visita', `${payload.new.visitor_name} — Apt ${payload.new.destination_apartment || '?'}`, 'visitor'));
                  await sendPushToMany(
                    adminIds,
                    '🚪 Nuevo Pase de Visita',
                    `${payload.new.visitor_name} — Apt ${payload.new.destination_apartment || '?'}`,
                    `/visitors/${payload.new.id}`
                  );
                }
              } catch (error) {
                console.error('❌ [Visitors] Error enviando notificación:', error);
              }
            })();
          }
          if (payload.eventType === 'UPDATE') {
            setVisitors((p) => p.map((v) => v.id === payload.new.id ? payload.new : v));
            playNotificationBeep('Visita Actualizada', `${payload.new.visitor_name} — ${payload.new.status?.toUpperCase() || ''}`);
            
            if (payload.new.resident_id && (payload.new.status === 'in' || payload.new.status === 'out')) {
              const title = payload.new.status === 'in' ? '✅ Visitante Ingresó' : '🚪 Visitante Salió';
              const message = `${payload.new.visitor_name} (${payload.new.code}) → ${payload.new.status.toUpperCase()}`;
              insertNotification(payload.new.resident_id, title, message, 'visitor');
              (async () => {
                try {
                  await sendPushToUser(payload.new.resident_id, title, message, `/visitors/${payload.new.id}`);
                } catch (error) {
                  console.error('❌ [Visitors] Error enviando push al residente:', error);
                }
              })();
            }
          }
          if (payload.eventType === 'DELETE') setVisitors((p) => p.filter((v) => v.id !== payload.old.id));
        })

        // ============================================
        // ✅ ANNOUNCEMENTS
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setAnnouncements((p) => [payload.new, ...p.filter((a) => a.id !== payload.new.id)]);
            playNotificationBeep('Nuevo Comunicado', payload.new.title);
            (async () => {
              try {
                 const recipients = usersRef.current
                  .filter((u) => u.complex_id === payload.new.complex_id && u.id !== currentUserRef.current?.id && u.status === 'active')
                  .map((u) => u.id);
                if (recipients.length > 0) {
                  recipients.forEach((uid) => insertNotification(uid, '📢 Nuevo Comunicado', payload.new.title, 'announcement'));
                  await sendPushToMany(
                    recipients,
                    '📢 Nuevo Comunicado',
                    payload.new.title,
                    `/announcements/${payload.new.id}`
                  );
                }
              } catch (error) {
                console.error('Error enviando notificación de comunicado:', error);
              }
            })();
          }
          if (payload.eventType === 'UPDATE') setAnnouncements((p) => p.map((a) => a.id === payload.new.id ? payload.new : a));
          if (payload.eventType === 'DELETE') setAnnouncements((p) => p.filter((a) => a.id !== payload.old.id));
        })

        // ============================================
        // ✅ COMMENTS
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_comments' }, (payload) => {
          if (payload.eventType === 'INSERT') { 
            setComments((p) => [...p.filter((c) => c.id !== payload.new.id), payload.new]); 
            playNotificationBeep('Nuevo Comentario', payload.new.text?.substring(0, 50) || 'Nuevo comentario');
            // Notificar al autor del comunicado si es de otro usuario
            if (payload.new.author_id && payload.new.announcement_id) {
              (async () => {
                try {
                  const { data: announcement } = await supabase.from('announcements').select('author_id').eq('id', payload.new.announcement_id).single();
                  if (announcement?.author_id && announcement.author_id !== payload.new.author_id) {
                    insertNotification(announcement.author_id, '💬 Nuevo Comentario', payload.new.text?.substring(0, 80) || 'Nuevo comentario', 'comment');
                  }
                } catch {}
              })();
            }
          }
          if (payload.eventType === 'DELETE') setComments((p) => p.filter((c) => c.id !== payload.old.id));
        })

        // ============================================
        // ✅ INCIDENTS - MEJORADO CON PUSH
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents((p) => [payload.new, ...p.filter((i) => i.id !== payload.new.id)]);
            playNotificationBeep('Nueva Incidencia', `${payload.new.title} — ${payload.new.priority || 'Normal'}`);
            
            (async () => {
              try {
                const adminIds = await getAdminIdsForComplex(payload.new.complex_id);
                if (adminIds.length > 0) {
                  adminIds.forEach((uid) => insertNotification(uid, '🚨 Nueva Incidencia Reportada', `${payload.new.title} — ${payload.new.priority || 'Normal'}`, 'incident'));
                  await sendPushToMany(
                    adminIds,
                    '🚨 Nueva Incidencia Reportada',
                    `${payload.new.title} — ${payload.new.priority || 'Normal'}`,
                    `/incidents/${payload.new.id}`
                  );
                }
              } catch (error) {
                console.error('❌ [Incidents] Error enviando notificación:', error);
              }
            })();
          }
          if (payload.eventType === 'UPDATE') setIncidents((p) => p.map((i) => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setIncidents((p) => p.filter((i) => i.id !== payload.old.id));
        })

        // ============================================
        // ✅ RESERVATIONS - MEJORADO CON PUSH
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setReservations((p) => [payload.new, ...p.filter((r) => r.id !== payload.new.id)]);
            playNotificationBeep('Nueva Reserva', `${payload.new.area_name} — ${payload.new.reservation_date || ''}`);
            
            (async () => {
              try {
                const adminIds = await getAdminIdsForComplex(payload.new.complex_id);
                if (adminIds.length > 0) {
                  adminIds.forEach((uid) => insertNotification(uid, '📅 Nueva Solicitud de Reserva', `${payload.new.area_name} — ${payload.new.reservation_date || ''}`, 'reservation'));
                  await sendPushToMany(
                    adminIds,
                    '📅 Nueva Solicitud de Reserva',
                    `${payload.new.area_name} — ${payload.new.reservation_date || ''}`,
                    `/reservations/${payload.new.id}`
                  );
                }
              } catch (error) {
                console.error('❌ [Reservations] Error enviando notificación:', error);
              }
            })();
          }
          if (payload.eventType === 'UPDATE') setReservations((p) => p.map((r) => r.id === payload.new.id ? payload.new : r));
          if (payload.eventType === 'DELETE') setReservations((p) => p.filter((r) => r.id !== payload.old.id));
        })

        // ============================================
        // ✅ PROFILES
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers((p) => [payload.new, ...p.filter((u) => u.id !== payload.new.id)]);
            if (payload.new.role === 'guard') setGuards((p) => [payload.new, ...p.filter((g) => g.id !== payload.new.id)]);
            playNotificationBeep('Nuevo Usuario', `${payload.new.name || ''} — ${payload.new.role || ''}`);
          }
          if (payload.eventType === 'UPDATE') {
            setUsers((p) => p.map((u) => u.id === payload.new.id ? payload.new : u));
            if (payload.new.role === 'guard') setGuards((p) => p.map((g) => g.id === payload.new.id ? payload.new : g));
            else setGuards((p) => p.filter((g) => g.id !== payload.new.id));
          }
          if (payload.eventType === 'DELETE') { setUsers((p) => p.filter((u) => u.id !== payload.old.id)); setGuards((p) => p.filter((g) => g.id !== payload.old.id)); }
        })

        // ============================================
        // ✅ RESIDENTIAL_COMPLEXES
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'residential_complexes' }, (payload) => {
          if (payload.eventType === 'INSERT') setComplexes((p) => [payload.new, ...p.filter((c) => c.id !== payload.new.id)]);
          if (payload.eventType === 'UPDATE') setComplexes((p) => p.map((c) => c.id === payload.new.id ? payload.new : c));
          if (payload.eventType === 'DELETE') setComplexes((p) => p.filter((c) => c.id !== payload.old.id));
        })

        // ============================================
        // ✅ APARTMENTS
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, (payload) => {
          if (payload.eventType === 'INSERT') setApartments((p) => [...p.filter((a) => a.id !== payload.new.id), payload.new]);
          if (payload.eventType === 'UPDATE') setApartments((p) => p.map((a) => a.id === payload.new.id ? payload.new : a));
          if (payload.eventType === 'DELETE') setApartments((p) => p.filter((a) => a.id !== payload.old.id));
        })

        // ============================================
        // ✅ NOTIFICATIONS
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!currentUser || payload.new.user_id === currentUser.id) {
              setNotifications((p) => [payload.new, ...p.filter((n) => n.id !== payload.new.id)]);
              playNotificationBeep(payload.new.title || 'Notificación', payload.new.message || '');
            }
          }
          if (payload.eventType === 'UPDATE') setNotifications((p) => p.map((n) => n.id === payload.new.id ? payload.new : n));
          if (payload.eventType === 'DELETE') setNotifications((p) => p.filter((n) => n.id !== payload.old.id));
        })

        // ============================================
        // ✅ AUDIT_LOGS
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.eventType === 'INSERT') setAudits((p) => [payload.new, ...p.slice(0, 99)]);
        })

        // ============================================
        // ✅ USAGE_LOG (uso diario, en vivo para super_admin)
        // ============================================
        .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_log' }, (payload) => {
          if (currentUser?.role !== 'super_admin') return;
          if (payload.eventType === 'INSERT') {
            setDailyUsage((p) => [...p.filter((r) => r.id !== payload.new.id), payload.new]);
          }
          if (payload.eventType === 'UPDATE') {
            setDailyUsage((p) => p.map((r) => (r.id === payload.new.id ? payload.new : r)));
          }
        })

        .subscribe((status, err) => {
          if (disposed) return;
          if (status === 'SUBSCRIBED') { setIsWsConnected(true); retries = 0; }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsWsConnected(false);
            if (retries < MAX_RETRIES && !reconnectTimer) {
              retries++;
              reconnectTimer = setTimeout(() => { reconnectTimer = null; connect(); }, 2000 * retries);
            }
          }
        });
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (channel) supabase.removeChannel(channel);
      channel = null;
    };
  }, [currentUser, getAdminIdsForComplex]);

  // ============================================
  // ✅ PRESENCIA EN TIEMPO REAL (conectados/desconectados)
  // Todos los usuarios se registran en el canal; solo el super_admin
  // consume el estado para ver quién está en línea.
  // ============================================
  useEffect(() => {
    if (!currentUser?.id) return;
    let presenceChannel;
    let cancelled = false;

    try {
      presenceChannel = supabase.channel('presence-online-v1');
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          if (cancelled || currentUser?.role !== 'super_admin') return;
          try {
            const state = presenceChannel.presenceState();
            const entries = [];
            Object.values(state).forEach((arr) => {
              if (Array.isArray(arr)) arr.forEach((e) => entries.push(e));
            });
            // Agrupar por usuario y contar dispositivos (pestañas/PWA)
            const byUser = {};
            entries.forEach((e) => {
              if (!e || !e.id) return;
              if (!byUser[e.id]) {
                byUser[e.id] = { ...e, devices: 1 };
              } else {
                byUser[e.id].devices += 1;
                // Mantener el ingreso más reciente
                if (e.online_at && e.online_at > (byUser[e.id].online_at || '')) {
                  byUser[e.id].online_at = e.online_at;
                }
              }
            });
            setOnlineUsers(Object.values(byUser));
          } catch (err) {
            console.warn('[Presencia] Error en sync:', err);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && !cancelled) {
            await presenceChannel.track({
              id: currentUser.id,
              name: currentUser.name || 'Usuario',
              role: currentUser.role || 'resident',
              complex_id: currentUser.complex_id || null,
              online_at: new Date().toISOString(),
            });
            console.log('🟢 [Presencia] Usuario registrado en línea:', currentUser.name);
            // Registrar sesión del día (uso diario por conjunto)
            logDailyUsage(currentUser).catch(() => {});
          }
        });
    } catch (err) {
      console.warn('[Presencia] Error inicializando canal:', err);
    }

    return () => {
      cancelled = true;
      try {
        if (presenceChannel) {
          presenceChannel.untrack().catch(() => {});
          supabase.removeChannel(presenceChannel);
        }
      } catch {}
      setOnlineUsers([]);
    };
  }, [currentUser?.id, currentUser?.role]);

  const checkResourceLimit = (type) => {
    const plan = currentComplex?.plan || 'free';
    const limits = PLAN_LIMITS[plan];
    let current = 0; let max = Infinity;
    if (type === 'apartments') { current = apartments.length; max = limits.max_apartments; }
    else if (type === 'guards') { current = guards.length; max = limits.max_guards; }
    else if (type === 'areas') { const distinctAreas = new Set(reservations.map((r) => r.area_name)).size; current = distinctAreas; max = limits.max_areas; }
    return { allowed: current < max, current, max, planName: limits.name, plan };
  };
  const handleLimitExceeded = (type) => {
    const limit = checkResourceLimit(type);
    if (!limit.allowed) {
      const labels = { apartments: 'apartamentos', guards: 'guardas', areas: 'áreas comunes' };
      alert(`Límite alcanzado.\n\nHas usado ${limit.current} de ${limit.max} ${labels[type]} permitidos en tu ${limit.planName}.\n\nPor el momento no puedes reservar más.`);
      return true;
    }
    return false;
  };

  // ============================================
  // CRUD con soporte standalone
  // ============================================

  const createComplex = async (data) => {
    if (standalone) {
      const id = genId('c');
      const payload = { id, name: data.name, code: data.code, address: data.address || '', plan: data.plan || 'pro', subscription_status: data.subscription_status || 'active', subscription_expiry: data.subscription_expiry || new Date(Date.now()+30*24*60*60*1000).toISOString(), status: data.status || 'active', created_at: new Date().toISOString() };
      const { data: created, error } = await supabase.from('residential_complexes').insert(payload).select().single();
      if (!error && created) { setComplexes((p) => [created, ...p]); playSuccessChime(); return created; }
      return null;
    }
    try { const res = await apiFetch('/api/complexes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (res.ok) { const created = await res.json(); playSuccessChime(); return created; } } catch (e) { console.error(e); } return null;
  };

  const updateComplex = async (id, data) => {
    if (standalone) {
      const { data: updated, error } = await supabase.from('residential_complexes').update({ name: data.name, code: data.code, address: data.address, plan: data.plan, subscription_status: data.subscription_status, subscription_expiry: data.subscription_expiry, status: data.status }).eq('id', id).select().single();
      if (!error && updated) { setComplexes((prev) => prev.map((c) => (c.id === id ? updated : c))); if (currentComplex?.id === id) updateComplexSession(updated); playSuccessChime(); }
      return;
    }
    try { const res = await apiFetch(`/api/complexes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (res.ok) { const updated = await res.json(); setComplexes((prev) => prev.map((c) => (c.id === id ? updated : c))); if (currentComplex?.id === id) updateComplexSession(updated); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const deleteComplex = async (id) => {
    if (standalone) {
      const { error } = await supabase.from('residential_complexes').delete().eq('id', id);
      if (error) { console.error('deleteComplex error:', error.message); alert(`No se pudo eliminar el conjunto: ${error.message}`); return; }
      setComplexes((prev) => prev.filter((c) => c.id !== id)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/complexes/${id}`, { method: 'DELETE' }); if (res.ok) { setComplexes((prev) => prev.filter((c) => c.id !== id)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const toggleComplexStatus = async (id) => { const target = complexes.find((c) => c.id === id); if (!target) return; const nextStatus = target.status === 'active' ? 'blocked' : 'active'; await updateComplex(id, { ...target, status: nextStatus }); };

  const changeComplexPlan = async (id, plan) => { const target = complexes.find((c) => c.id === id); if (!target) return; const nextExpiry = new Date(Date.now()+30*24*60*60*1000).toISOString(); await updateComplex(id, { ...target, plan, subscription_status: 'active', subscription_expiry: nextExpiry }); };

  const markComplexPaid = async (complex) => {
    const nextExpiry = new Date(Date.now()+30*24*60*60*1000).toISOString();
    await updateComplex(complex.id, { ...complex, subscription_status: 'active', subscription_expiry: nextExpiry });
    if (currentUser) generateSubscriptionReceiptPDF(complex, currentUser);
    playSuccessChime();
  };

  const createAdmin = async (data) => {
    if (standalone) {
      const { data: user, error } = await supabase.functions.invoke('admin-create', { body: data });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("not found") || msg.includes("Function not found") || msg.includes("404")) {
          alert("Edge Function 'admin-create' no desplegada. Ve a Supabase Dashboard > Edge Functions y desplegala o ejecuta: npx supabase functions deploy admin-create --project-ref kptuyksmdomgqntsdzsu");
          return null;
        }
        alert(`No se pudo crear el administrador: ${msg}`);
        return null;
      }
      if (user && user.error) { alert(`No se pudo crear: ${user.error}`); return null; }
      if (!user || !user.id) { alert("Respuesta inesperada del servidor al crear admin"); return null; }
      setUsers((p) => [user, ...p]);
      playSuccessChime();
      return user;
    }
    try { const res = await apiFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, role: 'admin', status: 'active' }) }); if (res.ok) { const user = await res.json(); playSuccessChime(); return user; } const err = await res.json().catch(()=>({})); alert(err.error || "No se pudo crear admin (backend)"); } catch (e) { console.error(e); } return null;
  };

  const purgeUserAccountCascading = async (userId) => {
    const userToPurge = users.find((u) => u.id === userId);
    if (standalone) {
      await supabase.from('visitors').delete().eq('resident_id', userId);
      await supabase.from('reservations').delete().eq('resident_id', userId);
      await supabase.from('incidents').delete().eq('reported_by', userId);
      await supabase.from('announcement_comments').delete().eq('author_id', userId);
      await supabase.from('notifications').delete().eq('user_id', userId);
      await supabase.from('apartments').update({ resident_id: null, status: 'available' }).eq('resident_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);
      const audit = { id: genId('aud'), complex_id: userToPurge?.complex_id || 'system', user_id: currentUser?.id || 'super_admin', user_name: currentUser?.name || 'Super Admin', action: 'purge_user', entity: 'profiles', entity_id: userId, details: JSON.stringify({ email: userToPurge?.email, name: userToPurge?.name }), created_at: new Date().toISOString() };
      await supabase.from('audit_logs').insert(audit).then(() => {}, () => {});
      setUsers((prev) => prev.filter((u) => u.id !== userId)); setVisitors((prev) => prev.filter((v) => v.resident_id !== userId)); setReservations((prev) => prev.filter((r) => r.resident_id !== userId)); setAudits((prev) => [audit, ...prev]);
      if (userToPurge && currentUser) generateUserDeletionCertificatePDF(userToPurge, currentUser);
      playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/users/${userId}/purge`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operatorId: currentUser?.id, operatorName: currentUser?.name }) }); if (res.ok) { const result = await res.json(); setUsers((prev) => prev.filter((u) => u.id !== userId)); setVisitors((prev) => prev.filter((v) => v.resident_id !== userId)); setReservations((prev) => prev.filter((r) => r.resident_id !== userId)); if (result.audit) setAudits((prev) => [result.audit, ...prev]); if (userToPurge && currentUser) generateUserDeletionCertificatePDF(userToPurge, currentUser); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const approveResident = async (userId, apartment) => {
    if (standalone) { const { data: updated } = await supabase.from('profiles').update({ status: 'active', apartment: apartment || 'Pendiente' }).eq('id', userId).select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at').single(); if (updated) { setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u))); playSuccessChime(); } return; }
    try { const res = await apiFetch(`/api/users/${userId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active', apartment }) }); if (res.ok) { const updated = await res.json(); setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u))); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const rejectResident = async (userId) => {
    if (standalone) { const { data: updated } = await supabase.from('profiles').update({ status: 'blocked' }).eq('id', userId).select('id, name, email, role, complex_id, apartment, phone, status, face_photo, created_at').single(); if (updated) { setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u))); playTrashWhoosh(); } return; }
    try { const res = await apiFetch(`/api/users/${userId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'blocked' }) }); if (res.ok) { const updated = await res.json(); setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u))); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const createApartment = async (data) => {
    if (!currentComplex) return;
    if (handleLimitExceeded('apartments')) return;
    if (standalone) { const id = genId('apt'); const payload = { id, complex_id: currentComplex.id, number: data.number, floor: data.floor || 1, status: data.status || 'available', resident_id: data.resident_id || null, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('apartments').insert(payload).select().single(); if (!error && created) { setApartments((p) => [...p, created]); playSuccessChime(); } return; }
    try { const res = await apiFetch('/api/apartments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, complex_id: currentComplex.id }) }); if (res.ok) { await res.json(); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const updateApartmentStatus = async (id, status, resident_id) => {
    if (standalone) { const target = apartments.find((a) => a.id === id); if (!target) return; const { data: updated } = await supabase.from('apartments').update({ status, resident_id: resident_id || null }).eq('id', id).select().single(); if (updated) { setApartments((prev) => prev.map((a) => (a.id === id ? updated : a))); playSuccessChime(); } return; }
    try { const target = apartments.find((a) => a.id === id); if (!target) return; const res = await apiFetch(`/api/apartments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...target, status, resident_id }) }); if (res.ok) { const updated = await res.json(); setApartments((prev) => prev.map((a) => (a.id === id ? updated : a))); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const deleteApartment = async (id) => {
    if (standalone) {
      const { error } = await supabase.from('apartments').delete().eq('id', id);
      if (error) { console.error('deleteApartment error:', error.message); alert(`No se pudo eliminar el apartamento: ${error.message}`); return; }
      setApartments((prev) => prev.filter((a) => a.id !== id)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/apartments/${id}`, { method: 'DELETE' }); if (res.ok) { setApartments((prev) => prev.filter((a) => a.id !== id)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const updateApartmentResident = async (apartmentId, residentId) => {
    if (standalone) {
      const target = apartments.find((a) => a.id === apartmentId); if (!target) return;
      const { data: updated } = await supabase.from('apartments').update({ resident_id: residentId || null, status: residentId ? 'occupied' : 'available' }).eq('id', apartmentId).select().single();
      if (updated) { setApartments((prev) => prev.map((a) => (a.id === apartmentId ? updated : a))); if (residentId) { const u = users.find((x) => x.id === residentId); if (u) await supabase.from('profiles').update({ apartment: target.number }).eq('id', residentId); } playSuccessChime(); }
      return;
    }
    try { const target = apartments.find((a) => a.id === apartmentId); if (!target) return; const res = await apiFetch(`/api/apartments/${apartmentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...target, resident_id: residentId, status: residentId ? 'occupied' : 'available' }) }); if (res.ok) { const updated = await res.json(); setApartments((prev) => prev.map((a) => (a.id === apartmentId ? updated : a))); if (residentId) { const userToUpdate = users.find((u) => u.id === residentId); if (userToUpdate) await apiFetch(`/api/users/${residentId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...userToUpdate, apartment: target.number }) }); } playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const createGuard = async (data) => {
    if (!currentComplex) return null;
    if (handleLimitExceeded('guards')) return null;
    if (standalone) {
      const { data: created, error } = await supabase.functions.invoke('guard-create', { body: { ...data, complex_id: currentComplex.id } });
      if (error) {
        const msg = error.message || "";
        if (msg.includes("not found") || msg.includes("Function not found") || msg.includes("404")) {
          alert("Edge Function 'guard-create' no desplegada. Desplegala en Supabase Dashboard.");
          return null;
        }
        alert(`No se pudo crear el guarda: ${msg}`);
        return null;
      }
      if (created && created.error) { alert(`No se pudo crear: ${created.error}`); return null; }
      if (!created || !created.id) { alert("Respuesta inesperada al crear guarda"); return null; }
      setGuards((p) => [created, ...p]);
      setUsers((p) => [created, ...p]);
      playSuccessChime();
      return created;
    }
    try { const res = await apiFetch('/api/guards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, complex_id: currentComplex.id }) }); if (res.ok) { const created = await res.json(); playSuccessChime(); return created; } } catch (e) { console.error(e); } return null;
  };

  const changePassword = async (userId, currentPassword, newPassword) => {
    if (standalone) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      playSuccessChime(); return { success: true };
    }
    try { const res = await apiFetch(`/api/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) }); if (res.ok) { playSuccessChime(); return { success: true }; } const data = await res.json(); return { success: false, error: data.error }; } catch (e) { console.error(e); return { success: false, error: 'Error de conexión' }; }
  };

  const deleteGuard = async (id) => {
    if (standalone) {
      const { error } = await supabase.from('profiles').delete().eq('id', id).eq('role', 'guard');
      if (error) { console.error('deleteGuard error:', error.message); alert(`No se pudo eliminar el guarda: ${error.message}`); return; }
      setGuards((prev) => prev.filter((g) => g.id !== id)); setUsers((prev) => prev.filter((u) => u.id !== id)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/guards/${id}`, { method: 'DELETE' }); if (res.ok) { setGuards((prev) => prev.filter((g) => g.id !== id)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const createAnnouncement = async (title, content) => {
    if (!currentComplex || !currentUser) return;
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      console.warn('createAnnouncement: role no autorizado:', currentUser.role);
      return;
    }
    if (standalone) { const id = genId('ann'); const payload = { id, complex_id: currentComplex.id, title, content, author_name: currentUser.name, author_id: currentUser.id, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('announcements').insert(payload).select().single(); if (!error && created) { setAnnouncements((p) => [created, ...p]); playSuccessChime(); } return; }
    try { const res = await apiFetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complex_id: currentComplex.id, title, content, author_name: currentUser.name, author_id: currentUser.id }) }); if (res.ok) { await res.json(); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const deleteAnnouncement = async (id) => {
    if (!currentUser) return;
    // Solo admin o super_admin pueden eliminar comunicados
    if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      console.warn('deleteAnnouncement: role no autorizado:', currentUser.role);
      return;
    }
    if (standalone) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) { console.error('deleteAnnouncement error:', error.message); alert('No se pudo borrar: ' + error.message + '\nEjecuta supabase-standalone-fix.sql'); return; }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id)); setComments((prev) => prev.filter((c) => c.announcement_id !== id)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' }); if (res.ok) { setAnnouncements((prev) => prev.filter((a) => a.id !== id)); setComments((prev) => prev.filter((c) => c.announcement_id !== id)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  const addComment = async (announcementId, content) => {
    if (!currentUser) return;
    if (standalone) { const id = genId('comm'); const payload = { id, announcement_id: announcementId, author_name: currentUser.name, author_id: currentUser.id, content, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('announcement_comments').insert(payload).select().single(); if (!error && created) { setComments((p) => [...p, created]); playNotificationBeep('Nuevo Comentario', content.substring(0, 50)); } return; }
    try { const res = await apiFetch(`/api/announcements/${announcementId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_name: currentUser.name, author_id: currentUser.id, content }) }); if (res.ok) { await res.json(); playNotificationBeep('Nuevo Comentario', content.substring(0, 50)); } } catch (e) { console.error(e); }
  };

  const deleteComment = async (commentId) => {
    if (!currentUser) return;
    // Buscar el comentario para verificar autorización
    const comment = comments.find((c) => c.id === commentId);
    // Solo el autor del comentario o admin/super_admin pueden borrarlo
    if (comment && comment.author_id !== currentUser.id && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
      console.warn('deleteComment: role no autorizado');
      return;
    }
    if (standalone) {
      const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);
      if (error) { console.error('deleteComment error:', error.message); alert(`No se pudo eliminar el comentario: ${error.message}`); return; }
      setComments((prev) => prev.filter((c) => c.id !== commentId)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/announcements/comments/${commentId}`, { method: 'DELETE' }); if (res.ok) { setComments((prev) => prev.filter((c) => c.id !== commentId)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };

  // ✅ MEJORADO: updateIncidentStatus con notificación push
  const updateIncidentStatus = async (id, status) => {
    if (standalone) {
      const { data: updated } = await supabase.from('incidents').update({ status }).eq('id', id).select().single();
      if (updated) {
        if (updated.reported_by) {
          insertNotification(updated.reported_by, '🔄 Incidencia Actualizada', `La incidencia "${updated.title}" cambió a: ${status}`, 'incident');
          try {
            await sendPushToUser(
              updated.reported_by,
              '🔄 Incidencia Actualizada',
              `La incidencia "${updated.title}" cambió a: ${status}`,
              `/incidents/${id}`
            );
          } catch (error) {
            console.error('❌ [Incidents] Error enviando push al reportante:', error);
          }
        }
        setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
        playSuccessChime();
      }
      return;
    }
    try { const res = await apiFetch(`/api/incidents/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (res.ok) { const updated = await res.json(); setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i))); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  // ✅ MEJORADO: updateReservationStatus con notificación push
  const updateReservationStatus = async (id, status) => {
    if (standalone) {
      const { data: updated } = await supabase.from('reservations').update({ status }).eq('id', id).select().single();
      if (updated) {
        if (updated.resident_id) {
          insertNotification(
            updated.resident_id,
            status === 'approved' ? '✅ Reserva Aprobada' : '❌ Reserva Rechazada',
            `Reserva "${updated.area_name}" ha sido ${status}`,
            'reservation'
          );
          try {
            await sendPushToUser(
              updated.resident_id,
              status === 'approved' ? '✅ Reserva Aprobada' : '❌ Reserva Rechazada',
              `Reserva "${updated.area_name}" ha sido ${status}`,
              `/reservations/${id}`
            );
          } catch (error) {
            console.error('❌ [Reservations] Error enviando push al residente:', error);
          }
        }
        setReservations((prev) => prev.map((r) => (r.id === id ? updated : r)));
        playSuccessChime();
      }
      return;
    }
    try { const res = await apiFetch(`/api/reservations/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (res.ok) { const updated = await res.json(); setReservations((prev) => prev.map((r) => (r.id === id ? updated : r))); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const createVisitorPass = async (data) => {
    if (!currentComplex || !currentUser) return null;
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let codePart = ''; for (let i = 0; i < 4; i++) codePart += chars.charAt(Math.floor(Math.random() * chars.length));
    const code = `VIS-${codePart}`;
    if (standalone) { const id = genId('vis'); const payload = { id, complex_id: currentComplex.id, code, visitor_name: data.visitor_name, purpose: data.purpose, destination_apartment: data.destination_apartment || currentUser.apartment || 'Apt', resident_name: currentUser.name, resident_id: currentUser.id, status: 'registered', created_at: new Date().toISOString() }; const { data: visitor, error } = await supabase.from('visitors').insert(payload).select().single(); if (!error && visitor) { setVisitors((p) => [visitor, ...p]); playSuccessChime(); return visitor; } return null; }
    try { const res = await apiFetch('/api/visitors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complex_id: currentComplex.id, code, visitor_name: data.visitor_name, purpose: data.purpose, destination_apartment: data.destination_apartment || currentUser.apartment || 'Apt', resident_name: currentUser.name, resident_id: currentUser.id, status: 'registered' }) }); if (res.ok) { const visitor = await res.json(); playSuccessChime(); return visitor; } } catch (e) { console.error(e); } return null;
  };

  const createIncident = async (data) => {
    if (!currentComplex || !currentUser) return;
    if (standalone) { const id = genId('inc'); const payload = { id, complex_id: currentComplex.id, title: data.title, description: data.description || '', priority: data.priority || 'medium', status: data.status || 'open', reported_by: currentUser.id, apartment: currentUser.apartment || 'Apt', attachments: data.attachments ? JSON.stringify(data.attachments) : null, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('incidents').insert(payload).select().single(); if (!error && created) { setIncidents((p) => [created, ...p]); playSuccessChime(); } return; }
    try { const res = await apiFetch('/api/incidents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, complex_id: currentComplex.id, reported_by: currentUser.id, apartment: currentUser.apartment || 'Apt' }) }); if (res.ok) { await res.json(); playSuccessChime(); } } catch (e) { console.error(e); }
  };

  const createReservation = async (data) => {
    if (!currentComplex || !currentUser) return { success: false, message: 'No hay usuario o complejo activo.' };
    if (standalone) {
      const { data: existing } = await supabase.from('reservations').select('*').eq('complex_id', currentComplex.id).eq('area_name', data.area_name).eq('reservation_date', data.reservation_date).in('status', ['pending','approved']);
      const start = Number((data.start_time||'').replace(':','')); const end = Number((data.end_time||'').replace(':',''));
      const overlaps = (existing||[]).filter((item) => { if (!item.start_time || !item.end_time) return false; const s = Number(String(item.start_time).replace(':','')); const e = Number(String(item.end_time).replace(':','')); return !(end <= s || start >= e); });
      if (overlaps.length > 0) return { success: false, message: 'Ese horario ya está ocupado. Elige otro día o cambia la hora.' };
      const id = genId('res'); const payload = { id, complex_id: currentComplex.id, area_name: data.area_name, reservation_date: data.reservation_date, start_time: data.start_time, end_time: data.end_time, resident_id: currentUser.id, resident_name: currentUser.name, apartment: currentUser.apartment || 'Apt', status: 'pending', created_at: new Date().toISOString() };
      const { data: created, error } = await supabase.from('reservations').insert(payload).select().single();
      if (error) return { success: false, message: error.message };
      if (created) { setReservations((p) => [created, ...p]); playSuccessChime(); return { success: true, data: created }; }
      return { success: false, message: 'No se pudo crear la reserva.' };
    }
    try { const res = await apiFetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, complex_id: currentComplex.id, resident_id: currentUser.id, resident_name: currentUser.name, apartment: currentUser.apartment || 'Apt', status: 'pending' }) }); if (res.ok) { const created = await res.json(); playSuccessChime(); return { success: true, data: created }; } const payload = await res.json().catch(() => ({})); return { success: false, message: payload.error || 'No se pudo crear la reserva.' }; } catch (e) { console.error(e); return { success: false, message: 'Error al crear la reserva.' }; }
  };

  const findVisitorByCode = (code) => { const clean = code.trim().toUpperCase(); return visitors.find((v) => v.code.toUpperCase() === clean || v.code.toUpperCase() === `VIS-${clean}`); };

  const updateVisitorStatus = async (id, status) => {
    if (standalone) {
      const now = new Date().toISOString(); const update = { status }; if (status === 'in') update.checked_in_at = now; if (status === 'out') update.checked_out_at = now;
      const { data: visitor } = await supabase.from('visitors').update(update).eq('id', id).select().single();
      if (visitor) {
        if (visitor.resident_id) {
          insertNotification(
            visitor.resident_id,
            status === 'in' ? '✅ Visitante Ingresó' : status === 'out' ? '🚪 Visitante Salió' : 'Pase Actualizado',
            `${visitor.visitor_name} (${visitor.code}) → ${status.toUpperCase()}`,
            'visitor'
          );
        }
        setVisitors((prev) => prev.map((v) => (v.id === id ? visitor : v)));
        playNotificationBeep(status === 'in' ? 'Visitante Ingresó' : 'Visitante Salió', `${visitor.visitor_name} (${visitor.code}) → ${status.toUpperCase()}`);
      }
      return;
    }
    try { const res = await apiFetch(`/api/visitors/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (res.ok) { const updated = await res.json(); setVisitors((prev) => prev.map((v) => (v.id === id ? updated : v))); playNotificationBeep(status === 'in' ? 'Visitante Ingresó' : 'Visitante Salió', `Estado actualizado a ${status.toUpperCase()}`); } } catch (e) { console.error(e); }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUser) return;
    if (standalone) { await supabase.from('notifications').update({ read: 1 }).eq('user_id', currentUser.id); setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 }))); return; }
    try { await apiFetch('/api/notifications/read-all', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id }) }); setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 }))); } catch (e) { console.error(e); }
  };

  const clearNotifications = async () => {
    if (!currentUser) return;
    if (standalone) { await supabase.from('notifications').delete().eq('user_id', currentUser.id); setNotifications([]); return; }
    try { await apiFetch('/api/notifications/clear', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentUser.id }) }); setNotifications([]); } catch (e) { console.error(e); }
  };

  return (
    <DataContext.Provider value={{ 
      complexes, users, apartments, guards, announcements, comments, 
      incidents, reservations, visitors, audits, notifications, 
      isWsConnected, isLoading, onlineUsers, dailyUsage, refreshData, 
      createComplex, updateComplex, deleteComplex, toggleComplexStatus, changeComplexPlan, markComplexPaid,
      createAdmin, purgeUserAccountCascading, approveResident, rejectResident,
      createApartment, updateApartmentStatus, updateApartmentResident, changePassword, deleteApartment,
      createGuard, deleteGuard,
      createAnnouncement, deleteAnnouncement, addComment, deleteComment,
      updateIncidentStatus, updateReservationStatus,
      createVisitorPass, createIncident, createReservation,
      findVisitorByCode, updateVisitorStatus,
      markAllNotificationsAsRead, clearNotifications,
      checkResourceLimit 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};