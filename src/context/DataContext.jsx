import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PLAN_LIMITS } from '../types.js';
import { useAuth } from './AuthContext';
import { playNotificationBeep as playNotificationSound, playSuccessChime, playTrashWhoosh } from '../lib/sound';
import { notifyWhenHidden } from '../lib/appNotifications';
import { generateUserDeletionCertificatePDF, generateSubscriptionReceiptPDF } from '../lib/pdf';
import { getApiBaseUrl, isStandalone } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import { fetchBootstrapDirect, fetchComplexesDirect } from '../lib/supabaseRepo';

const DataContext = createContext(undefined);
const apiBase = getApiBaseUrl();
const apiFetch = (path, options = {}) => fetch(`${apiBase}${path}`, options);
const genId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
const playNotificationBeep = () => {
  playNotificationSound();
  notifyWhenHidden('Conjuntos App', 'Tienes una actualización nueva.');
};

export const DataProvider = ({ children }) => {
  const { currentUser, currentComplex, updateComplexSession } = useAuth();

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

  const standalone = isStandalone() || !apiBase;

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (standalone) {
        // Directo a Supabase cloud, sin IP ni servidor local
        if (currentUser) {
          const data = await fetchBootstrapDirect(currentUser.complex_id || '', currentUser.id, currentUser.role);
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
        setIncidents(data.incidents || []);
        setReservations(data.reservations || []);
        setVisitors(data.visitors || []);
        setAudits(data.audits || []);
        setNotifications(data.notifications || []);
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

  // Realtime: Supabase Realtime como fuente ÚNICA para web y móvil
  // No hay WebSocket Express — solo Supabase Realtime vía PostgreSQL WAL
  // Funciona SIEMPRE sin importar si el CRUD va por Express o por Supabase directo
  useEffect(() => {
    let channel;
    let retries = 0;
    const MAX_RETRIES = 5;

    const connect = () => {
      channel = supabase.channel('conjuntos-v3')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, (payload) => {
          if (payload.eventType === 'INSERT') { setVisitors((p) => [payload.new, ...p.filter((v) => v.id !== payload.new.id)]); playNotificationBeep(); }
          if (payload.eventType === 'UPDATE') { setVisitors((p) => p.map((v) => v.id === payload.new.id ? payload.new : v)); playNotificationBeep(); }
          if (payload.eventType === 'DELETE') setVisitors((p) => p.filter((v) => v.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
          if (payload.eventType === 'INSERT') { setAnnouncements((p) => [payload.new, ...p.filter((a) => a.id !== payload.new.id)]); playNotificationBeep(); }
          if (payload.eventType === 'UPDATE') setAnnouncements((p) => p.map((a) => a.id === payload.new.id ? payload.new : a));
          if (payload.eventType === 'DELETE') setAnnouncements((p) => p.filter((a) => a.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_comments' }, (payload) => {
          if (payload.eventType === 'INSERT') { setComments((p) => [...p.filter((c) => c.id !== payload.new.id), payload.new]); playNotificationBeep(); }
          if (payload.eventType === 'DELETE') setComments((p) => p.filter((c) => c.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, (payload) => {
          if (payload.eventType === 'INSERT') { setIncidents((p) => [payload.new, ...p.filter((i) => i.id !== payload.new.id)]); playNotificationBeep(); }
          if (payload.eventType === 'UPDATE') setIncidents((p) => p.map((i) => i.id === payload.new.id ? payload.new : i));
          if (payload.eventType === 'DELETE') setIncidents((p) => p.filter((i) => i.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, (payload) => {
          if (payload.eventType === 'INSERT') { setReservations((p) => [payload.new, ...p.filter((r) => r.id !== payload.new.id)]); playNotificationBeep(); }
          if (payload.eventType === 'UPDATE') setReservations((p) => p.map((r) => r.id === payload.new.id ? payload.new : r));
          if (payload.eventType === 'DELETE') setReservations((p) => p.filter((r) => r.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setUsers((p) => [payload.new, ...p.filter((u) => u.id !== payload.new.id)]);
            if (payload.new.role === 'guard') setGuards((p) => [payload.new, ...p.filter((g) => g.id !== payload.new.id)]);
            playNotificationBeep();
          }
          if (payload.eventType === 'UPDATE') {
            setUsers((p) => p.map((u) => u.id === payload.new.id ? payload.new : u));
            if (payload.new.role === 'guard') setGuards((p) => p.map((g) => g.id === payload.new.id ? payload.new : g));
            else setGuards((p) => p.filter((g) => g.id !== payload.new.id));
          }
          if (payload.eventType === 'DELETE') { setUsers((p) => p.filter((u) => u.id !== payload.old.id)); setGuards((p) => p.filter((g) => g.id !== payload.old.id)); }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'residential_complexes' }, (payload) => {
          if (payload.eventType === 'INSERT') setComplexes((p) => [payload.new, ...p.filter((c) => c.id !== payload.new.id)]);
          if (payload.eventType === 'UPDATE') setComplexes((p) => p.map((c) => c.id === payload.new.id ? payload.new : c));
          if (payload.eventType === 'DELETE') setComplexes((p) => p.filter((c) => c.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'apartments' }, (payload) => {
          if (payload.eventType === 'INSERT') setApartments((p) => [...p.filter((a) => a.id !== payload.new.id), payload.new]);
          if (payload.eventType === 'UPDATE') setApartments((p) => p.map((a) => a.id === payload.new.id ? payload.new : a));
          if (payload.eventType === 'DELETE') setApartments((p) => p.filter((a) => a.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!currentUser || payload.new.user_id === currentUser.id) {
              setNotifications((p) => [payload.new, ...p.filter((n) => n.id !== payload.new.id)]);
              playNotificationBeep();
            }
          }
          if (payload.eventType === 'UPDATE') setNotifications((p) => p.map((n) => n.id === payload.new.id ? payload.new : n));
          if (payload.eventType === 'DELETE') setNotifications((p) => p.filter((n) => n.id !== payload.old.id));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.eventType === 'INSERT') setAudits((p) => [payload.new, ...p.slice(0, 99)]);
        })
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') { setIsWsConnected(true); retries = 0; }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsWsConnected(false);
            if (retries < MAX_RETRIES) { retries++; setTimeout(connect, 2000 * retries); }
          }
        });
    };

    connect();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [currentUser]);

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

  // --- CRUD con soporte standalone ---
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
      alert('Para crear un administrador se necesita el backend seguro. Configura VITE_API_BASE_URL en la PWA.');
      return null;
    }
    try { const res = await apiFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, role: 'admin', status: 'active' }) }); if (res.ok) { const user = await res.json(); playSuccessChime(); return user; } } catch (e) { console.error(e); } return null;
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
      const id = genId('u');
      const payload = { id, name: data.name, email: data.email.trim().toLowerCase(), password: data.password || 'guard123', role: 'guard', complex_id: currentComplex.id, phone: data.phone || null, status: 'active', created_at: new Date().toISOString() };
      const { data: created, error } = await supabase.from('profiles').insert(payload).select('id, name, email, phone, complex_id, status, created_at').single();
      if (!error && created) { setGuards((p) => [created, ...p]); setUsers((p) => [payload, ...p]); playSuccessChime(); return created; }
      return null;
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
    if (standalone) { const id = genId('ann'); const payload = { id, complex_id: currentComplex.id, title, content, author_name: currentUser.name, author_id: currentUser.id, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('announcements').insert(payload).select().single(); if (!error && created) { setAnnouncements((p) => [created, ...p]); playSuccessChime(); } return; }
    try { const res = await apiFetch('/api/announcements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ complex_id: currentComplex.id, title, content, author_name: currentUser.name, author_id: currentUser.id }) }); if (res.ok) { await res.json(); playSuccessChime(); } } catch (e) { console.error(e); }
  };
  const deleteAnnouncement = async (id) => {
    if (standalone) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) { console.error('deleteAnnouncement error:', error.message); alert('No se pudo borrar: ' + error.message + '\nEjecuta supabase-standalone-fix.sql'); return; }
      setAnnouncements((prev) => prev.filter((a) => a.id !== id)); setComments((prev) => prev.filter((c) => c.announcement_id !== id)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/announcements/${id}`, { method: 'DELETE' }); if (res.ok) { setAnnouncements((prev) => prev.filter((a) => a.id !== id)); setComments((prev) => prev.filter((c) => c.announcement_id !== id)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };
  const addComment = async (announcementId, content) => {
    if (!currentUser) return;
    if (standalone) { const id = genId('comm'); const payload = { id, announcement_id: announcementId, author_name: currentUser.name, author_id: currentUser.id, content, created_at: new Date().toISOString() }; const { data: created, error } = await supabase.from('announcement_comments').insert(payload).select().single(); if (!error && created) { setComments((p) => [...p, created]); playNotificationBeep(); } return; }
    try { const res = await apiFetch(`/api/announcements/${announcementId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_name: currentUser.name, author_id: currentUser.id, content }) }); if (res.ok) { await res.json(); playNotificationBeep(); } } catch (e) { console.error(e); }
  };
  const deleteComment = async (commentId) => {
    if (standalone) {
      const { error } = await supabase.from('announcement_comments').delete().eq('id', commentId);
      if (error) { console.error('deleteComment error:', error.message); alert(`No se pudo eliminar el comentario: ${error.message}`); return; }
      setComments((prev) => prev.filter((c) => c.id !== commentId)); playTrashWhoosh(); return;
    }
    try { const res = await apiFetch(`/api/announcements/comments/${commentId}`, { method: 'DELETE' }); if (res.ok) { setComments((prev) => prev.filter((c) => c.id !== commentId)); playTrashWhoosh(); } } catch (e) { console.error(e); }
  };
  const updateIncidentStatus = async (id, status) => {
    if (standalone) { const { data: updated } = await supabase.from('incidents').update({ status }).eq('id', id).select().single(); if (updated) { setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i))); playSuccessChime(); } return; }
    try { const res = await apiFetch(`/api/incidents/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (res.ok) { const updated = await res.json(); setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i))); playSuccessChime(); } } catch (e) { console.error(e); }
  };
  const updateReservationStatus = async (id, status) => {
    if (standalone) {
      const { data: updated } = await supabase.from('reservations').update({ status }).eq('id', id).select().single();
      if (updated) {
        if (updated.resident_id) await supabase.from('notifications').insert({ id: genId('notif'), user_id: updated.resident_id, title: status === 'approved' ? 'Reserva Aprobada' : status === 'rejected' ? 'Reserva Rechazada' : 'Reserva Actualizada', message: `Reserva "${updated.area_name}" → ${status}`, read: 0, created_at: new Date().toISOString() }).then(()=>{},()=>{});
        setReservations((prev) => prev.map((r) => (r.id === id ? updated : r))); playSuccessChime();
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
      // Validación simple de solapamiento (igual que server.ts)
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
      if (visitor) { if (visitor.resident_id) await supabase.from('notifications').insert({ id: genId('notif'), user_id: visitor.resident_id, title: status === 'in' ? 'Visitante Ingresó' : status === 'out' ? 'Visitante Salió' : 'Pase Actualizado', message: `${visitor.visitor_name} (${visitor.code}) → ${status.toUpperCase()}`, read: 0, created_at: now }).then(()=>{},()=>{}); setVisitors((prev) => prev.map((v) => (v.id === id ? visitor : v))); playNotificationBeep(); }
      return;
    }
    try { const res = await apiFetch(`/api/visitors/${id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (res.ok) { const updated = await res.json(); setVisitors((prev) => prev.map((v) => (v.id === id ? updated : v))); playNotificationBeep(); } } catch (e) { console.error(e); }
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
    <DataContext.Provider value={{ complexes, users, apartments, guards, announcements, comments, incidents, reservations, visitors, audits, notifications, isWsConnected, isLoading, refreshData, createComplex, updateComplex, deleteComplex, toggleComplexStatus, changeComplexPlan, markComplexPaid, createAdmin, purgeUserAccountCascading, approveResident, rejectResident, createApartment, updateApartmentStatus, updateApartmentResident, changePassword, deleteApartment, createGuard, deleteGuard, createAnnouncement, deleteAnnouncement, addComment, deleteComment, updateIncidentStatus, updateReservationStatus, createVisitorPass, createIncident, createReservation, findVisitorByCode, updateVisitorStatus, markAllNotificationsAsRead, clearNotifications, checkResourceLimit }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};
