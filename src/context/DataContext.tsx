import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ResidentialComplex,
  User,
  ApartmentBlock,
  Apartment,
  Guard,
  Announcement,
  AnnouncementComment,
  Incident,
  Reservation,
  Visitor,
  Audit,
  NotificationItem,
  PLAN_LIMITS,
  PlanType,
  IncidentStatus,
  ReservationStatus,
  VisitorStatus,
} from '../types';
import {
  INITIAL_COMPLEXES,
  INITIAL_USERS,
  INITIAL_BLOCKS,
  INITIAL_APARTMENTS,
  INITIAL_GUARDS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_COMMENTS,
  INITIAL_INCIDENTS,
  INITIAL_RESERVATIONS,
  INITIAL_VISITORS,
  INITIAL_AUDITS,
  INITIAL_NOTIFICATIONS,
} from '../lib/initialData';
import { useAuth } from './AuthContext';
import { generateComplexCode, generateVisitorCode } from '../lib/utils';
import { soundEngine } from '../lib/sound';
import { capNotificationService } from '../lib/capacitorNotifications';
import { supabase, isSupabaseConfigured, checkSupabaseHealth, ConnectionStatus } from '../lib/supabase';
import { generateUserDeletionCertificatePDF } from '../lib/pdf';


export interface DataContextType {
  complexes: ResidentialComplex[];
  users: User[];
  blocks: ApartmentBlock[];
  apartments: Apartment[];
  guards: Guard[];
  announcements: Announcement[];
  comments: AnnouncementComment[];
  incidents: Incident[];
  reservations: Reservation[];
  visitors: Visitor[];
  audits: Audit[];
  notifications: NotificationItem[];

  // Supabase sync status
  isSupabaseLive: boolean;
  supabaseStatus: ConnectionStatus | null;
  refreshSupabaseStatus: () => Promise<void>;

  // Super Admin operations
  createComplex: (data: Partial<ResidentialComplex>) => ResidentialComplex;
  updateComplex: (id: number, data: Partial<ResidentialComplex>) => void;
  deleteComplex: (id: number) => void;
  markComplexPaid: (id: number, months: number, notes?: string) => void;
  toggleComplexStatus: (id: number) => void;
  changeComplexPlan: (id: number, plan: PlanType) => void;
  createAdmin: (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    password?: string;
  }) => { success: boolean; message?: string };
  deleteAdmin: (userId: string) => { success: boolean; message?: string };
  purgeUserAccountCascading: (userId: string, options?: { downloadPdf?: boolean }) => {
    success: boolean;
    message?: string;
    deletedSummary?: {
      user: User;
      apartments: number;
      incidents: number;
      reservations: number;
      visitors: number;
      announcements: number;
      comments: number;
    };
  };

  // Admin operations
  approveResident: (userId: string, apartmentNumber: string) => void;
  rejectResident: (userId: string) => void;
  createBlock: (name: string, description?: string) => { success: boolean; message?: string };
  deleteBlock: (id: number) => void;
  createApartment: (data: { blockId?: number; number: string; floor?: string }) => { success: boolean; message?: string };
  updateApartmentStatus: (id: number, status: Apartment['status']) => void;
  deleteApartment: (id: number) => void;
  createGuard: (name: string, phone: string, shift?: string) => { success: boolean; message?: string };
  deleteGuard: (id: number) => void;
  createAnnouncement: (title: string, body: string, attachments?: string[]) => void;
  deleteAnnouncement: (id: number) => void;
  updateIncidentStatus: (id: number, status: IncidentStatus) => void;
  updateReservationStatus: (id: number, status: ReservationStatus) => void;

  // Realtime comments
  addComment: (announcementId: number, body: string) => void;
  deleteComment: (commentId: number) => void;

  // Resident operations
  createVisitorPass: (data: {
    name: string;
    documentNumber?: string;
    phone?: string;
    visitingName: string;
    apartmentNumber?: string;
  }) => Visitor;
  createIncident: (data: {
    title: string;
    description: string;
    priority: Incident['priority'];
    attachments?: string[];
  }) => void;
  createReservation: (data: {
    areaName: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => void;

  // Guard operations
  findVisitorByCode: (code: string) => Visitor | undefined;
  updateVisitorStatus: (visitorId: number, status: VisitorStatus) => void;

  // Notifications
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;

  // Limit check
  checkResourceLimit: (complexId: number, resource: 'apartments' | 'guards' | 'areas') => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentComplex } = useAuth();

  const [complexes, setComplexes] = useState<ResidentialComplex[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_complexes') || 'null') || INITIAL_COMPLEXES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_users') || 'null') || INITIAL_USERS;
  });

  const [blocks, setBlocks] = useState<ApartmentBlock[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_blocks') || 'null') || INITIAL_BLOCKS;
  });

  const [apartments, setApartments] = useState<Apartment[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_apartments') || 'null') || INITIAL_APARTMENTS;
  });

  const [guards, setGuards] = useState<Guard[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_guards') || 'null') || INITIAL_GUARDS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_announcements') || 'null') || INITIAL_ANNOUNCEMENTS;
  });

  const [comments, setComments] = useState<AnnouncementComment[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_comments') || 'null') || INITIAL_COMMENTS;
  });

  const [incidents, setIncidents] = useState<Incident[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_incidents') || 'null') || INITIAL_INCIDENTS;
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_reservations') || 'null') || INITIAL_RESERVATIONS;
  });

  const [visitors, setVisitors] = useState<Visitor[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_visitors') || 'null') || INITIAL_VISITORS;
  });

  const [audits, setAudits] = useState<Audit[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_audits') || 'null') || INITIAL_AUDITS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    return JSON.parse(localStorage.getItem('conjuntos_notifications') || 'null') || INITIAL_NOTIFICATIONS;
  });

  // Supabase live status state
  const [supabaseStatus, setSupabaseStatus] = useState<ConnectionStatus | null>(null);
  const isSupabaseLive = Boolean(supabaseStatus?.isConnected);

  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  const refreshSupabaseStatus = useCallback(async () => {
    const status = await checkSupabaseHealth();
    setSupabaseStatus(status);
  }, []);

  // Check initial Supabase health
  useEffect(() => {
    refreshSupabaseStatus();
  }, [refreshSupabaseStatus]);

  // Load from Supabase on startup if configured & set up Realtime subscription
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const loadInitialSupabaseData = async () => {
      try {
        const [
          complexesRes,
          profilesRes,
          announcementsRes,
          commentsRes,
          incidentsRes,
          reservationsRes,
          visitorsRes,
          auditsRes,
        ] = await Promise.all([
          supabase.from('residential_complexes').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('announcements').select('*'),
          supabase.from('announcement_comments').select('*'),
          supabase.from('incidents').select('*'),
          supabase.from('reservations').select('*'),
          supabase.from('visitors').select('*'),
          supabase.from('audits').select('*').order('created_at', { ascending: false }),
        ]);

        if (complexesRes.data && complexesRes.data.length > 0) {
          setComplexes(complexesRes.data);
        }
        if (profilesRes.data && profilesRes.data.length > 0) {
          setUsers(profilesRes.data as User[]);
        }
        if (announcementsRes.data) {
          setAnnouncements(announcementsRes.data);
        }
        if (commentsRes.data) {
          setComments(commentsRes.data);
        }
        if (incidentsRes.data) {
          setIncidents(incidentsRes.data);
        }
        if (reservationsRes.data) {
          setReservations(reservationsRes.data);
        }
        if (visitorsRes.data) {
          setVisitors(visitorsRes.data);
        }
        if (auditsRes.data) {
          setAudits(auditsRes.data);
        }
      } catch (err) {
        console.warn('Supabase initial fetch warning (using local store fallback):', err);
      }
    };

    // Request notification permission for background alerts on startup
    capNotificationService.requestPermissions();

    loadInitialSupabaseData();

    // Setup Realtime Channel with robust deduplication
    const channel = supabase
      .channel('conjuntos-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComm = payload.new as AnnouncementComment;
            setComments((prev) => {
              if (prev.some((c) => c.id === newComm.id)) return prev;
              const optimisticIdx = prev.findIndex(
                (c) =>
                  c.announcement_id === newComm.announcement_id &&
                  c.user_id === newComm.user_id &&
                  c.body === newComm.body &&
                  typeof c.id === 'number' &&
                  c.id > 1000000000000
              );
              if (optimisticIdx !== -1) {
                const copy = [...prev];
                copy[optimisticIdx] = newComm;
                return copy;
              }
              return [...prev, newComm];
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) setComments((prev) => prev.filter((c) => c.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newVis = payload.new as Visitor;
            setVisitors((prev) => {
              if (prev.some((v) => v.id === newVis.id)) return prev;
              const optimisticIdx = prev.findIndex(
                (v) =>
                  v.code === newVis.code &&
                  typeof v.id === 'number' &&
                  v.id > 1000000000000
              );
              if (optimisticIdx !== -1) {
                const copy = [...prev];
                copy[optimisticIdx] = newVis;
                return copy;
              }
              return [newVis, ...prev];
            });
            capNotificationService.sendNotification({
              title: '🚗 Nuevo Pase de Visita Registrado',
              body: `${newVis.name || 'Visita'} al Depto ${newVis.apartment_number || ''}`,
              soundType: 'beep',
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedVis = payload.new as Visitor;
            setVisitors((prev) => prev.map((v) => (v.id === updatedVis.id ? { ...v, ...updatedVis } : v)));
            if (updatedVis.status === 'in') {
              capNotificationService.sendNotification({
                title: '✅ Ingreso en Garita Registrado',
                body: `Visita ${updatedVis.name || ''} ingresó al condominio`,
                soundType: 'success',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newInc = payload.new as Incident;
            setIncidents((prev) => {
              if (prev.some((i) => i.id === newInc.id)) return prev;
              const optimisticIdx = prev.findIndex(
                (i) =>
                  i.title === newInc.title &&
                  i.residential_complex_id === newInc.residential_complex_id &&
                  typeof i.id === 'number' &&
                  i.id > 1000000000000
              );
              if (optimisticIdx !== -1) {
                const copy = [...prev];
                copy[optimisticIdx] = newInc;
                return copy;
              }
              return [newInc, ...prev];
            });
            capNotificationService.sendNotification({
              title: '⚠️ Nueva Incidencia Reportada',
              body: `${newInc.title || 'Incidencia'}: ${newInc.description?.substring(0, 70) || ''}`,
              soundType: 'error',
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedInc = payload.new as Incident;
            setIncidents((prev) => prev.map((i) => (i.id === updatedInc.id ? { ...i, ...updatedInc } : i)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newRes = payload.new as Reservation;
            setReservations((prev) => {
              if (prev.some((r) => r.id === newRes.id)) return prev;
              const optimisticIdx = prev.findIndex(
                (r) =>
                  r.area_name === newRes.area_name &&
                  r.date === newRes.date &&
                  r.user_id === newRes.user_id &&
                  typeof r.id === 'number' &&
                  r.id > 1000000000000
              );
              if (optimisticIdx !== -1) {
                const copy = [...prev];
                copy[optimisticIdx] = newRes;
                return copy;
              }
              return [newRes, ...prev];
            });
            capNotificationService.sendNotification({
              title: '📅 Nueva Solicitud de Reserva',
              body: `${newRes.area_name} para el ${newRes.date}`,
              soundType: 'beep',
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedRes = payload.new as Reservation;
            setReservations((prev) => prev.map((r) => (r.id === updatedRes.id ? { ...r, ...updatedRes } : r)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnn = payload.new as Announcement;
            setAnnouncements((prev) => {
              if (prev.some((a) => a.id === newAnn.id)) return prev;
              // If an optimistic announcement exists with matching title & complex, replace the temporary one
              const optimisticIdx = prev.findIndex(
                (a) =>
                  a.title === newAnn.title &&
                  a.residential_complex_id === newAnn.residential_complex_id &&
                  typeof a.id === 'number' &&
                  a.id > 1000000000000
              );
              if (optimisticIdx !== -1) {
                const copy = [...prev];
                copy[optimisticIdx] = newAnn;
                return copy;
              }
              return [newAnn, ...prev];
            });
            capNotificationService.sendNotification({
              title: `📢 Comunicado: ${newAnn.title}`,
              body: newAnn.body?.substring(0, 80) || 'Nuevo aviso de administración',
              soundType: 'success',
            });
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) setAnnouncements((prev) => prev.filter((a) => a.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audits' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAud = payload.new as Audit;
            setAudits((prev) => (prev.some((a) => a.id === newAud.id) ? prev : [newAud, ...prev]));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('conjuntos_complexes', JSON.stringify(complexes));
  }, [complexes]);

  useEffect(() => {
    localStorage.setItem('conjuntos_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('conjuntos_blocks', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('conjuntos_apartments', JSON.stringify(apartments));
  }, [apartments]);

  useEffect(() => {
    localStorage.setItem('conjuntos_guards', JSON.stringify(guards));
  }, [guards]);

  useEffect(() => {
    localStorage.setItem('conjuntos_announcements', JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('conjuntos_comments', JSON.stringify(comments));
  }, [comments]);

  useEffect(() => {
    localStorage.setItem('conjuntos_incidents', JSON.stringify(incidents));
  }, [incidents]);

  useEffect(() => {
    localStorage.setItem('conjuntos_reservations', JSON.stringify(reservations));
  }, [reservations]);

  useEffect(() => {
    localStorage.setItem('conjuntos_visitors', JSON.stringify(visitors));
  }, [visitors]);

  useEffect(() => {
    localStorage.setItem('conjuntos_audits', JSON.stringify(audits));
  }, [audits]);

  useEffect(() => {
    localStorage.setItem('conjuntos_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Automated audit logger
  const logAudit = (action: string, type: string, id?: number | null, newValues?: Record<string, unknown>, oldValues?: Record<string, unknown>) => {
    const newAudit: Audit = {
      id: Date.now(),
      user_id: currentUser?.id || 'system',
      user_name: currentUser?.name || 'Sistema',
      residential_complex_id: currentComplex?.id || null,
      complex_name: currentComplex?.name || 'Global',
      action,
      auditable_type: type,
      auditable_id: id || null,
      new_values: newValues || null,
      old_values: oldValues || null,
      created_at: new Date().toISOString(),
    };
    setAudits((prev) => [newAudit, ...prev]);

    if (supabase && isSupabaseConfigured) {
      supabase.from('audits').insert({
        action,
        auditable_type: type,
        auditable_id: id || null,
        new_values: newValues,
        old_values: oldValues,
        residential_complex_id: currentComplex?.id || null,
      }).then();
    }
  };

  // Helper to send in-app notification
  const sendNotification = (userId: string, title: string, message: string, type?: string, data?: Record<string, unknown>) => {
    const newNotif: NotificationItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_id: userId,
      title,
      message,
      type,
      read: false,
      data,
      created_at: new Date().toISOString(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    soundEngine.playNotificationBeep();

    if (supabase && isSupabaseConfigured) {
      supabase.from('notifications').insert({
        title,
        message,
        type,
        read: false,
        data,
      }).then();
    }
  };

  // Check resource limits against subscription plan
  const checkResourceLimit = (complexId: number, resource: 'apartments' | 'guards' | 'areas'): boolean => {
    const complex = complexes.find((c) => c.id === complexId);
    if (!complex) return true;
    const planConfig = PLAN_LIMITS[complex.plan] || PLAN_LIMITS.free;

    if (resource === 'apartments') {
      if (planConfig.maxApartments === -1) return true;
      const count = apartments.filter((a) => a.residential_complex_id === complexId).length;
      return count < planConfig.maxApartments;
    }

    if (resource === 'guards') {
      if (planConfig.maxGuards === -1) return true;
      const count = guards.filter((g) => g.residential_complex_id === complexId).length;
      return count < planConfig.maxGuards;
    }

    if (resource === 'areas') {
      if (planConfig.maxAreas === -1) return true;
      return true;
    }

    return true;
  };

  // SUPER ADMIN OPERATIONS
  const createComplex = (data: Partial<ResidentialComplex>): ResidentialComplex => {
    const code = generateComplexCode(data.name || 'Conjunto');
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = trialEnd;

    const newComplex: ResidentialComplex = {
      id: Date.now(),
      name: data.name || 'Nuevo Conjunto Residencial',
      code,
      address: data.address || '',
      city: data.city || '',
      phone: data.phone || '',
      status: 'active',
      plan: data.plan || 'free',
      subscription_status: 'trial',
      trial_ends_at: trialEnd,
      current_period_end: periodEnd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data,
    };

    setComplexes((prev) => [...prev, newComplex]);
    logAudit('CREATE_COMPLEX', 'ResidentialComplex', newComplex.id, { name: newComplex.name, code });

    if (supabase && isSupabaseConfigured) {
      supabase.from('residential_complexes').insert({
        name: newComplex.name,
        code: newComplex.code,
        address: newComplex.address,
        city: newComplex.city,
        phone: newComplex.phone,
        status: newComplex.status,
        plan: newComplex.plan,
        subscription_status: newComplex.subscription_status,
        trial_ends_at: newComplex.trial_ends_at,
        current_period_end: newComplex.current_period_end,
      }).then();
    }

    return newComplex;
  };

  const updateComplex = (id: number, data: Partial<ResidentialComplex>) => {
    setComplexes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c))
    );
    logAudit('UPDATE_COMPLEX', 'ResidentialComplex', id, data);

    if (supabase && isSupabaseConfigured) {
      supabase.from('residential_complexes').update(data).eq('id', id).then();
    }
  };

  const deleteComplex = (id: number) => {
    setComplexes((prev) => prev.filter((c) => c.id !== id));
    logAudit('DELETE_COMPLEX', 'ResidentialComplex', id);

    if (supabase && isSupabaseConfigured) {
      supabase.from('residential_complexes').delete().eq('id', id).then();
    }
  };

  const markComplexPaid = (id: number, months: number, notes?: string) => {
    const complex = complexes.find((c) => c.id === id);
    if (!complex) return;

    const currentEnd = new Date(complex.current_period_end || Date.now());
    const baseDate = currentEnd.getTime() > Date.now() ? currentEnd : new Date();
    baseDate.setMonth(baseDate.getMonth() + months);

    const updated: Partial<ResidentialComplex> = {
      subscription_status: 'active',
      status: 'active',
      current_period_end: baseDate.toISOString(),
      subscription_notes: notes || `Pago registrado por ${months} mes(es).`,
      payment_receipt_uploaded_at: new Date().toISOString(),
    };

    updateComplex(id, updated);
    logAudit('MARK_PAID', 'ResidentialComplex', id, { months, newEnd: baseDate.toISOString() });
  };

  const toggleComplexStatus = (id: number) => {
    const complex = complexes.find((c) => c.id === id);
    if (!complex) return;
    const newStatus = complex.status === 'active' ? 'blocked' : 'active';
    const newSubStatus = newStatus === 'blocked' ? 'blocked' : 'active';

    updateComplex(id, { status: newStatus, subscription_status: newSubStatus });
    logAudit(newStatus === 'blocked' ? 'BLOCK_COMPLEX' : 'UNBLOCK_COMPLEX', 'ResidentialComplex', id);
  };

  const changeComplexPlan = (id: number, plan: PlanType) => {
    updateComplex(id, { plan });
    logAudit('CHANGE_PLAN', 'ResidentialComplex', id, { plan });
  };

  const createAdmin = (data: {
    name: string;
    email: string;
    phone?: string;
    complexId: number;
    password?: string;
  }): { success: boolean; message?: string } => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanName = data.name.trim();

    if (!cleanName || !cleanEmail) {
      return { success: false, message: 'El nombre y correo electrónico son obligatorios.' };
    }

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, message: 'Ya existe un usuario con este correo electrónico.' };
    }

    const newAdmin: User = {
      id: `adm-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role_id: 2,
      role: 'admin',
      residential_complex_id: data.complexId,
      phone: data.phone?.trim() || '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newAdmin]);

    // Save password
    try {
      const passwords = JSON.parse(localStorage.getItem('conjuntos_passwords') || '{}');
      passwords[cleanEmail] = data.password?.trim() || 'admin123';
      localStorage.setItem('conjuntos_passwords', JSON.stringify(passwords));
    } catch {
      // ignore
    }

    logAudit('CREATE_ADMIN', 'User', null, { name: cleanName, email: cleanEmail, complexId: data.complexId });

    if (supabase && isSupabaseConfigured) {
      supabase.from('profiles').insert({
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: 'admin',
        residential_complex_id: newAdmin.residential_complex_id,
        phone: newAdmin.phone,
        status: 'active',
      }).then();
    }

    soundEngine.playSuccessChime();
    return { success: true, message: 'Administrador creado con éxito.' };
  };

  const deleteAdmin = (userId: string): { success: boolean; message?: string } => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    if (targetUser.role === 'super_admin') {
      return { success: false, message: 'No se puede eliminar la cuenta principal de Super Admin.' };
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Remove password
    try {
      const passwords = JSON.parse(localStorage.getItem('conjuntos_passwords') || '{}');
      delete passwords[targetUser.email.toLowerCase()];
      localStorage.setItem('conjuntos_passwords', JSON.stringify(passwords));
    } catch {
      // ignore
    }

    logAudit('DELETE_ADMIN', 'User', null, { name: targetUser.name, email: targetUser.email });

    if (supabase && isSupabaseConfigured) {
      supabase.from('profiles').delete().eq('id', userId).then();
      supabase.from('profiles').delete().eq('email', targetUser.email).then();
    }

    soundEngine.playTrashWhoosh();
    return { success: true, message: 'Administrador eliminado exitosamente.' };
  };

  /**
   * SUPER ADMIN EXCLUSIVE: Permanent Cascading Purge of an Account
   * Deletes the user profile, credentials, associated apartments/houses, incidents,
   * reservations, visitors, announcements, comments, and automatically generates
   * an official audit certificate PDF for security and compliance.
   */
  const purgeUserAccountCascading = (
    userId: string,
    options: { downloadPdf?: boolean } = { downloadPdf: true }
  ): {
    success: boolean;
    message?: string;
    deletedSummary?: {
      user: User;
      apartments: number;
      incidents: number;
      reservations: number;
      visitors: number;
      announcements: number;
      comments: number;
    };
  } => {
    // Only super_admin is authorized
    if (currentUser?.role !== 'super_admin') {
      return {
        success: false,
        message: 'Acceso denegado: Solo el Super Administrador puede ejecutar la purga total de cuentas.',
      };
    }

    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, message: 'Usuario no encontrado en la base de datos.' };
    }

    if (targetUser.role === 'super_admin') {
      return {
        success: false,
        message: 'Operación prohibida: La cuenta principal de Super Admin no puede ser purgada.',
      };
    }

    const userComplex = complexes.find((c) => c.id === targetUser.residential_complex_id);

    // 1. Find and purge apartments/houses associated with this user
    // A user might own an apartment via apartment_id or apartment_number or resident_name
    const targetAptNumber = targetUser.apartment_number?.trim().toLowerCase();
    const userApts = apartments.filter((a) => {
      if (targetUser.apartment_id && a.id === targetUser.apartment_id) return true;
      if (
        targetAptNumber &&
        a.residential_complex_id === targetUser.residential_complex_id &&
        a.number.trim().toLowerCase() === targetAptNumber
      ) {
        return true;
      }
      if (a.resident_name && a.resident_name.trim().toLowerCase() === targetUser.name.trim().toLowerCase()) {
        return true;
      }
      return false;
    });

    const deletedAptIds = userApts.map((a) => a.id);
    const deletedAptDetails = userApts.map((a) => `${a.block_name ? `${a.block_name} - ` : ''}Apto ${a.number}`);

    // Remove or reset apartments
    if (deletedAptIds.length > 0) {
      setApartments((prev) => prev.filter((a) => !deletedAptIds.includes(a.id)));
      if (supabase && isSupabaseConfigured) {
        deletedAptIds.forEach((aptId) => {
          supabase.from('apartments').delete().eq('id', aptId).then();
        });
      }
    }

    // 2. Incidents reported by this user
    const userIncidents = incidents.filter(
      (inc) => inc.reported_by === targetUser.id || inc.reporter_name === targetUser.name
    );
    const deletedIncidentIds = userIncidents.map((i) => i.id);
    if (deletedIncidentIds.length > 0) {
      setIncidents((prev) => prev.filter((i) => !deletedIncidentIds.includes(i.id)));
      if (supabase && isSupabaseConfigured) {
        deletedIncidentIds.forEach((incId) => {
          supabase.from('incidents').delete().eq('id', incId).then();
        });
      }
    }

    // 3. Reservations made by this user
    const userReservations = reservations.filter(
      (res) => res.user_id === targetUser.id || res.userName === targetUser.name
    );
    const deletedReservationIds = userReservations.map((r) => r.id);
    if (deletedReservationIds.length > 0) {
      setReservations((prev) => prev.filter((r) => !deletedReservationIds.includes(r.id)));
      if (supabase && isSupabaseConfigured) {
        deletedReservationIds.forEach((resId) => {
          supabase.from('reservations').delete().eq('id', resId).then();
        });
      }
    }

    // 4. Visitors and visitor passes
    const userVisitors = visitors.filter(
      (vis) =>
        vis.visiting_user_id === targetUser.id ||
        (targetAptNumber && vis.apartment_number?.trim().toLowerCase() === targetAptNumber)
    );
    const deletedVisitorIds = userVisitors.map((v) => v.id);
    if (deletedVisitorIds.length > 0) {
      setVisitors((prev) => prev.filter((v) => !deletedVisitorIds.includes(v.id)));
      if (supabase && isSupabaseConfigured) {
        deletedVisitorIds.forEach((vId) => {
          supabase.from('visitors').delete().eq('id', vId).then();
        });
      }
    }

    // 5. Announcements published by this user
    const userAnnouncements = announcements.filter((ann) => ann.published_by === targetUser.id);
    const deletedAnnIds = userAnnouncements.map((a) => a.id);
    if (deletedAnnIds.length > 0) {
      setAnnouncements((prev) => prev.filter((a) => !deletedAnnIds.includes(a.id)));
      if (supabase && isSupabaseConfigured) {
        deletedAnnIds.forEach((aId) => {
          supabase.from('announcements').delete().eq('id', aId).then();
        });
      }
    }

    // 6. Comments written by this user
    const userComments = comments.filter((c) => c.user_id === targetUser.id);
    const deletedCommentIds = userComments.map((c) => c.id);
    if (deletedCommentIds.length > 0) {
      setComments((prev) => prev.filter((c) => !deletedCommentIds.includes(c.id)));
      if (supabase && isSupabaseConfigured) {
        deletedCommentIds.forEach((cId) => {
          supabase.from('announcement_comments').delete().eq('id', cId).then();
        });
      }
    }

    // 7. Remove User from User List and Local Auth Passwords
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    try {
      const passwords = JSON.parse(localStorage.getItem('conjuntos_passwords') || '{}');
      delete passwords[targetUser.email.toLowerCase()];
      localStorage.setItem('conjuntos_passwords', JSON.stringify(passwords));
    } catch {
      // ignore
    }

    // 8. Delete from Supabase profiles
    if (supabase && isSupabaseConfigured) {
      supabase.from('profiles').delete().eq('id', userId).then();
      supabase.from('profiles').delete().eq('email', targetUser.email).then();
    }

    // 9. Generate Security Audit PDF Document
    if (options.downloadPdf !== false) {
      try {
        generateUserDeletionCertificatePDF({
          user: targetUser,
          complex: userComplex,
          deletedApartmentsCount: userApts.length,
          deletedApartmentsDetails: deletedAptDetails,
          deletedIncidentsCount: userIncidents.length,
          deletedReservationsCount: userReservations.length,
          deletedVisitorsCount: userVisitors.length,
          deletedAnnouncementsCount: userAnnouncements.length,
          deletedCommentsCount: userComments.length,
          performedBy: {
            name: currentUser?.name || 'Super Administrador',
            email: currentUser?.email || 'super@conjuntos.app',
            role: currentUser?.role || 'super_admin',
          },
          deletionDate: new Date().toLocaleString('es-ES'),
        });
      } catch (err) {
        console.error('Error al generar PDF de certificado:', err);
      }
    }

    // 10. Log in system audit table
    logAudit('PURGE_USER_CASCADE', 'User', null, {
      deletedUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        apartment_number: targetUser.apartment_number,
      },
      deletedApartments: userApts.length,
      deletedIncidents: userIncidents.length,
      deletedReservations: userReservations.length,
      deletedVisitors: userVisitors.length,
      deletedAnnouncements: userAnnouncements.length,
      deletedComments: userComments.length,
      purgedBy: currentUser?.email,
    });

    soundEngine.playTrashWhoosh();

    return {
      success: true,
      message: `Cuenta de ${targetUser.name} y todas sus propiedades/registros han sido borrados de la base de datos. Se ha generado y descargado el Certificado de Auditoría en PDF.`,
      deletedSummary: {
        user: targetUser,
        apartments: userApts.length,
        incidents: userIncidents.length,
        reservations: userReservations.length,
        visitors: userVisitors.length,
        announcements: userAnnouncements.length,
        comments: userComments.length,
      },
    };
  };

  // ADMIN OPERATIONS
  const approveResident = (userId: string, apartmentNumber: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user || !currentComplex) return;

    // Update user status
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              status: 'active',
              residential_complex_id: currentComplex.id,
              requested_complex_id: null,
              apartment_number: apartmentNumber,
              updated_at: new Date().toISOString(),
            }
          : u
      )
    );

    // Notify resident
    sendNotification(
      userId,
      '¡Cuenta Aprobada!',
      `El administrador de ${currentComplex.name} ha aprobado tu acceso para ${apartmentNumber}. Ya puedes iniciar sesión y usar todos los módulos.`,
      'resident_approved'
    );

    logAudit('APPROVE_RESIDENT', 'User', null, { userId, name: user.name, apartmentNumber });

    if (supabase && isSupabaseConfigured) {
      supabase.from('profiles').update({
        status: 'active',
        residential_complex_id: currentComplex.id,
        requested_complex_id: null,
        apartment_number: apartmentNumber,
      }).eq('email', user.email).then();
    }
  };

  const rejectResident = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    logAudit('REJECT_RESIDENT', 'User', null, { userId });

    if (supabase && isSupabaseConfigured && user) {
      supabase.from('profiles').delete().eq('email', user.email).then();
    }
  };

  const createBlock = (name: string, description?: string): { success: boolean; message?: string } => {
    if (!currentComplex) return { success: false, message: 'No hay conjunto seleccionado.' };

    const newBlock: ApartmentBlock = {
      id: Date.now(),
      residential_complex_id: currentComplex.id,
      name: name.trim(),
      description: description?.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setBlocks((prev) => [...prev, newBlock]);
    logAudit('CREATE_BLOCK', 'ApartmentBlock', newBlock.id, { name });

    if (supabase && isSupabaseConfigured) {
      supabase.from('apartment_blocks').insert({
        residential_complex_id: currentComplex.id,
        name: newBlock.name,
        description: newBlock.description,
      }).then();
    }

    return { success: true };
  };

  const deleteBlock = (id: number) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    logAudit('DELETE_BLOCK', 'ApartmentBlock', id);

    if (supabase && isSupabaseConfigured) {
      supabase.from('apartment_blocks').delete().eq('id', id).then();
    }
  };

  const createApartment = (data: {
    blockId?: number;
    number: string;
    floor?: string;
  }): { success: boolean; message?: string } => {
    if (!currentComplex) return { success: false, message: 'No hay conjunto seleccionado.' };

    if (!checkResourceLimit(currentComplex.id, 'apartments')) {
      const plan = PLAN_LIMITS[currentComplex.plan];
      return {
        success: false,
        message: `Has alcanzado el límite de ${plan.maxApartments} departamentos de tu Plan ${plan.name}. Actualiza tu plan para crear más.`,
      };
    }

    const block = blocks.find((b) => b.id === data.blockId);

    const newApt: Apartment = {
      id: Date.now(),
      residential_complex_id: currentComplex.id,
      apartment_block_id: data.blockId || null,
      block_name: block?.name || 'General',
      number: data.number.trim(),
      floor: data.floor?.trim() || '',
      status: 'available',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setApartments((prev) => [...prev, newApt]);
    logAudit('CREATE_APARTMENT', 'Apartment', newApt.id, { number: newApt.number, block: newApt.block_name });

    if (supabase && isSupabaseConfigured) {
      supabase.from('apartments').insert({
        residential_complex_id: currentComplex.id,
        apartment_block_id: data.blockId || null,
        number: newApt.number,
        floor: newApt.floor,
        status: 'available',
      }).then();
    }

    return { success: true };
  };

  const updateApartmentStatus = (id: number, status: Apartment['status']) => {
    setApartments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a))
    );
    logAudit('UPDATE_APARTMENT_STATUS', 'Apartment', id, { status });

    if (supabase && isSupabaseConfigured) {
      supabase.from('apartments').update({ status }).eq('id', id).then();
    }
  };

  const deleteApartment = (id: number) => {
    setApartments((prev) => prev.filter((a) => a.id !== id));
    logAudit('DELETE_APARTMENT', 'Apartment', id);

    if (supabase && isSupabaseConfigured) {
      supabase.from('apartments').delete().eq('id', id).then();
    }
  };

  const createGuard = (name: string, phone: string, shift?: string): { success: boolean; message?: string } => {
    if (!currentComplex) return { success: false, message: 'No hay conjunto seleccionado.' };

    if (!checkResourceLimit(currentComplex.id, 'guards')) {
      const plan = PLAN_LIMITS[currentComplex.plan];
      return {
        success: false,
        message: `Has alcanzado el límite de ${plan.maxGuards} guardias de tu Plan ${plan.name}. Actualiza tu plan para registrar más guardias.`,
      };
    }

    const newGuard: Guard = {
      id: Date.now(),
      user_id: `usr-guard-${Date.now()}`,
      residential_complex_id: currentComplex.id,
      name: name.trim(),
      phone: phone.trim(),
      shift: shift || 'Turno Completo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setGuards((prev) => [...prev, newGuard]);
    logAudit('CREATE_GUARD', 'Guard', newGuard.id, { name: newGuard.name, phone });

    if (supabase && isSupabaseConfigured) {
      supabase.from('guards').insert({
        residential_complex_id: currentComplex.id,
        name: newGuard.name,
        phone: newGuard.phone,
        shift: newGuard.shift,
      }).then();
    }

    return { success: true };
  };

  const deleteGuard = (id: number) => {
    setGuards((prev) => prev.filter((g) => g.id !== id));
    logAudit('DELETE_GUARD', 'Guard', id);

    if (supabase && isSupabaseConfigured) {
      supabase.from('guards').delete().eq('id', id).then();
    }
  };

  const createAnnouncement = (title: string, body: string, attachments?: string[]) => {
    if (!currentComplex || !currentUser) return;

    const tempId = Date.now();
    const newAnnouncement: Announcement = {
      id: tempId,
      residential_complex_id: currentComplex.id,
      title: title.trim(),
      body: body.trim(),
      published_by: currentUser.id,
      author_name: currentUser.name,
      author_role: 'Administrador',
      attachments: attachments || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setAnnouncements((prev) => {
      // Check if already present
      if (prev.some((a) => a.id === tempId || (a.title === newAnnouncement.title && a.residential_complex_id === currentComplex.id && Math.abs(new Date(a.created_at).getTime() - new Date(newAnnouncement.created_at).getTime()) < 3000))) {
        return prev;
      }
      return [newAnnouncement, ...prev];
    });

    // Broadcast notification to all complex residents
    users
      .filter((u) => u.residential_complex_id === currentComplex.id && u.role === 'resident')
      .forEach((res) => {
        sendNotification(res.id, `Nuevo Comunicado: ${title.slice(0, 30)}...`, body.slice(0, 80), 'announcement');
      });

    logAudit('CREATE_ANNOUNCEMENT', 'Announcement', newAnnouncement.id, { title });

    if (supabase && isSupabaseConfigured) {
      supabase.from('announcements').insert({
        residential_complex_id: currentComplex.id,
        title: newAnnouncement.title,
        body: newAnnouncement.body,
        attachments: newAnnouncement.attachments,
      }).select().single().then(({ data }) => {
        if (data) {
          // Replace temp ID with Postgres DB ID
          setAnnouncements((prev) => prev.map((a) => (a.id === tempId ? { ...a, id: data.id } : a)));
        }
      });
    }
  };

  const deleteAnnouncement = (id: number) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setComments((prev) => prev.filter((c) => c.announcement_id !== id));
    logAudit('DELETE_ANNOUNCEMENT', 'Announcement', id);

    if (supabase && isSupabaseConfigured) {
      supabase.from('announcements').delete().eq('id', id).then();
    }
  };

  const updateIncidentStatus = (id: number, status: IncidentStatus) => {
    const inc = incidents.find((i) => i.id === id);
    if (!inc) return;

    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status, updated_at: new Date().toISOString() } : i))
    );

    // Notify resident who reported it
    sendNotification(
      inc.reported_by,
      `Incidencia ${status.toUpperCase()}`,
      `Tu reporte "${inc.title}" ahora se encuentra en estado ${status}.`,
      'incident_update'
    );

    logAudit('UPDATE_INCIDENT_STATUS', 'Incident', id, { status });

    if (supabase && isSupabaseConfigured) {
      supabase.from('incidents').update({ status }).eq('id', id).then();
    }
  };

  const updateReservationStatus = (id: number, status: ReservationStatus) => {
    const res = reservations.find((r) => r.id === id);
    if (!res) return;

    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, updated_at: new Date().toISOString() } : r))
    );

    // Notify resident
    sendNotification(
      res.user_id,
      `Reserva ${status === 'approved' ? 'Aprobada' : 'Actualizada'}`,
      `Tu solicitud para ${res.area_name} del ${res.date} ha sido ${status}.`,
      'reservation_update'
    );

    logAudit('UPDATE_RESERVATION_STATUS', 'Reservation', id, { status });

    if (supabase && isSupabaseConfigured) {
      supabase.from('reservations').update({ status }).eq('id', id).then();
    }
  };

  // REALTIME COMMENTS
  const addComment = (announcementId: number, body: string) => {
    if (!currentUser || !currentComplex) return;

    const newComment: AnnouncementComment = {
      id: Date.now(),
      announcement_id: announcementId,
      user_id: currentUser.id,
      residential_complex_id: currentComplex.id,
      author_name: currentUser.name,
      author_role: currentUser.role === 'admin' ? 'Administrador' : `Residente (${currentUser.apartment_number || 'Apto'})`,
      body: body.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, newComment]);

    // If resident commented, notify admin
    if (currentUser.role === 'resident') {
      users
        .filter((u) => u.residential_complex_id === currentComplex.id && u.role === 'admin')
        .forEach((adm) => {
          sendNotification(
            adm.id,
            `Nuevo comentario de ${currentUser.name}`,
            body.slice(0, 70),
            'announcement_comment'
          );
        });
    }

    logAudit('ADD_COMMENT', 'AnnouncementComment', newComment.id, { announcementId, body: body.slice(0, 30) });

    if (supabase && isSupabaseConfigured) {
      supabase.from('announcement_comments').insert({
        announcement_id: announcementId,
        residential_complex_id: currentComplex.id,
        body: newComment.body,
      }).then();
    }
  };

  const deleteComment = (commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    logAudit('DELETE_COMMENT', 'AnnouncementComment', commentId);

    if (supabase && isSupabaseConfigured) {
      supabase.from('announcement_comments').delete().eq('id', commentId).then();
    }
  };

  // RESIDENT OPERATIONS
  const createVisitorPass = (data: {
    name: string;
    documentNumber?: string;
    phone?: string;
    visitingName: string;
    apartmentNumber?: string;
  }): Visitor => {
    const code = generateVisitorCode();
    const complexId = currentComplex?.id || 1;

    const newVisitor: Visitor = {
      id: Date.now(),
      code,
      residential_complex_id: complexId,
      name: data.name.trim(),
      document_number: data.documentNumber?.trim() || '',
      phone: data.phone?.trim() || '',
      apartment_number: data.apartmentNumber || currentUser?.apartment_number || 'Apto',
      visiting_name: data.visitingName.trim() || currentUser?.name || 'Residente',
      status: 'registered',
      approved: true,
      created_by: currentUser?.id || 'usr-resident-01',
      requested_by: currentUser?.id || 'usr-resident-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setVisitors((prev) => [newVisitor, ...prev]);

    // Notify guards
    users
      .filter((u) => u.residential_complex_id === complexId && u.role === 'guard')
      .forEach((guard) => {
        sendNotification(
          guard.id,
          'Nuevo Pase de Visita',
          `${newVisitor.visiting_name} (${newVisitor.apartment_number}) ha registrado a ${newVisitor.name}. Código: ${code}`,
          'guard_visitor_pass'
        );
      });

    logAudit('CREATE_VISITOR_PASS', 'Visitor', newVisitor.id, { code, visitorName: newVisitor.name });

    if (supabase && isSupabaseConfigured) {
      supabase.from('visitors').insert({
        residential_complex_id: complexId,
        code: newVisitor.code,
        name: newVisitor.name,
        document_number: newVisitor.document_number,
        phone: newVisitor.phone,
        visiting_name: newVisitor.visiting_name,
        apartment_number: newVisitor.apartment_number,
        status: 'registered',
        approved: true,
      }).then();
    }

    return newVisitor;
  };

  const createIncident = (data: {
    title: string;
    description: string;
    priority: Incident['priority'];
    attachments?: string[];
  }) => {
    if (!currentUser || !currentComplex) return;

    const newIncident: Incident = {
      id: Date.now(),
      residential_complex_id: currentComplex.id,
      reported_by: currentUser.id,
      reporter_name: currentUser.name,
      reporter_apartment: currentUser.apartment_number || 'Apto',
      title: data.title.trim(),
      description: data.description.trim(),
      status: 'open',
      priority: data.priority || 'medium',
      attachments: data.attachments || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setIncidents((prev) => [newIncident, ...prev]);

    // Notify admins
    users
      .filter((u) => u.residential_complex_id === currentComplex.id && u.role === 'admin')
      .forEach((adm) => {
        sendNotification(
          adm.id,
          `Nueva Incidencia: ${data.title.slice(0, 30)}`,
          `Reportado por ${currentUser.name} (${currentUser.apartment_number}): ${data.description.slice(0, 60)}`,
          'incident_created'
        );
      });

    logAudit('CREATE_INCIDENT', 'Incident', newIncident.id, { title: data.title, priority: data.priority });

    if (supabase && isSupabaseConfigured) {
      supabase.from('incidents').insert({
        residential_complex_id: currentComplex.id,
        title: newIncident.title,
        description: newIncident.description,
        priority: newIncident.priority,
        status: 'open',
        attachments: newIncident.attachments,
      }).then();
    }
  };

  const createReservation = (data: {
    areaName: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => {
    if (!currentUser || !currentComplex) return;

    const newReservation: Reservation = {
      id: Date.now(),
      residential_complex_id: currentComplex.id,
      user_id: currentUser.id,
      user_name: currentUser.name,
      apartment_number: currentUser.apartment_number || 'Apto',
      area_name: data.areaName,
      date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setReservations((prev) => [newReservation, ...prev]);

    // Notify admins
    users
      .filter((u) => u.residential_complex_id === currentComplex.id && u.role === 'admin')
      .forEach((adm) => {
        sendNotification(
          adm.id,
          'Nueva Solicitud de Reserva',
          `${currentUser.name} ha solicitado reservar ${data.areaName} para el ${data.date} (${data.startTime} - ${data.endTime}).`,
          'reservation_created'
        );
      });

    logAudit('CREATE_RESERVATION', 'Reservation', newReservation.id, { area: data.areaName, date: data.date });

    if (supabase && isSupabaseConfigured) {
      supabase.from('reservations').insert({
        residential_complex_id: currentComplex.id,
        area_name: data.areaName,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        status: 'pending',
      }).then();
    }
  };

  // GUARD OPERATIONS
  const findVisitorByCode = (code: string): Visitor | undefined => {
    const formatted = code.trim().replace(/\s+/g, '');
    return visitors.find((v) => v.code.replace(/\s+/g, '') === formatted);
  };

  const updateVisitorStatus = (visitorId: number, status: VisitorStatus) => {
    const vis = visitors.find((v) => v.id === visitorId);
    if (!vis) return;

    const now = new Date().toISOString();
    const updateData: Partial<Visitor> = { status, updated_at: now };

    if (status === 'in') {
      updateData.check_in_at = now;
      soundEngine.playNotificationBeep(880, 0.4);
    } else if (status === 'out') {
      updateData.check_out_at = now;
      soundEngine.playSuccessChime();
    } else if (status === 'confirmed') {
      soundEngine.playNotificationBeep(880, 0.3);
    }

    setVisitors((prev) => prev.map((v) => (v.id === visitorId ? { ...v, ...updateData } : v)));

    // Notify resident who requested the pass
    sendNotification(
      vis.requested_by,
      `Actualización de Visita: ${vis.name}`,
      status === 'in'
        ? `${vis.name} acaba de ingresar por la garita principal.`
        : status === 'out'
        ? `${vis.name} ha registrado su salida del conjunto.`
        : status === 'confirmed'
        ? `El pase de ${vis.name} fue confirmado por guardia ${currentUser?.name || ''}.`
        : `El ingreso de ${vis.name} fue rechazado.`,
      'visitor_status_update'
    );

    logAudit(`VISITOR_${status.toUpperCase()}`, 'Visitor', visitorId, { code: vis.code, status });

    if (supabase && isSupabaseConfigured) {
      supabase.from('visitors').update(updateData).eq('id', visitorId).then();
    }
  };

  // NOTIFICATIONS
  const markAllNotificationsAsRead = () => {
    if (!currentUser) return;
    setNotifications((prev) =>
      prev.map((n) => (n.user_id === currentUser.id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    if (!currentUser) return;
    setNotifications((prev) => prev.filter((n) => n.user_id !== currentUser.id));
  };

  return (
    <DataContext.Provider
      value={{
        complexes,
        users,
        blocks,
        apartments,
        guards,
        announcements,
        comments,
        incidents,
        reservations,
        visitors,
        audits,
        notifications,
        isSupabaseLive,
        supabaseStatus,
        refreshSupabaseStatus,
        createComplex,
        updateComplex,
        deleteComplex,
        markComplexPaid,
        toggleComplexStatus,
        changeComplexPlan,
        createAdmin,
        deleteAdmin,
        purgeUserAccountCascading,
        approveResident,
        rejectResident,
        createBlock,
        deleteBlock,
        createApartment,
        updateApartmentStatus,
        deleteApartment,
        createGuard,
        deleteGuard,
        createAnnouncement,
        deleteAnnouncement,
        updateIncidentStatus,
        updateReservationStatus,
        addComment,
        deleteComment,
        createVisitorPass,
        createIncident,
        createReservation,
        findVisitorByCode,
        updateVisitorStatus,
        markAllNotificationsAsRead,
        clearNotifications,
        checkResourceLimit,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
