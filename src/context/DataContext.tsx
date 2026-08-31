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
import { supabase, isSupabaseConfigured, checkSupabaseHealth, ConnectionStatus } from '../lib/supabase';

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
          announcementsRes,
          commentsRes,
          incidentsRes,
          reservationsRes,
          visitorsRes,
        ] = await Promise.all([
          supabase.from('residential_complexes').select('*'),
          supabase.from('announcements').select('*'),
          supabase.from('announcement_comments').select('*'),
          supabase.from('incidents').select('*'),
          supabase.from('reservations').select('*'),
          supabase.from('visitors').select('*'),
        ]);

        if (complexesRes.data && complexesRes.data.length > 0) {
          setComplexes(complexesRes.data);
        }
        if (announcementsRes.data && announcementsRes.data.length > 0) {
          setAnnouncements(announcementsRes.data);
        }
        if (commentsRes.data && commentsRes.data.length > 0) {
          setComments(commentsRes.data);
        }
        if (incidentsRes.data && incidentsRes.data.length > 0) {
          setIncidents(incidentsRes.data);
        }
        if (reservationsRes.data && reservationsRes.data.length > 0) {
          setReservations(reservationsRes.data);
        }
        if (visitorsRes.data && visitorsRes.data.length > 0) {
          setVisitors(visitorsRes.data);
        }
      } catch (err) {
        console.warn('Supabase initial fetch warning (using local store fallback):', err);
      }
    };

    loadInitialSupabaseData();

    // Setup Realtime Channel
    const channel = supabase
      .channel('conjuntos-realtime-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcement_comments' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComm = payload.new as AnnouncementComment;
            setComments((prev) => (prev.some((c) => c.id === newComm.id) ? prev : [...prev, newComm]));
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
            setVisitors((prev) => (prev.some((v) => v.id === newVis.id) ? prev : [newVis, ...prev]));
          } else if (payload.eventType === 'UPDATE') {
            const updatedVis = payload.new as Visitor;
            setVisitors((prev) => prev.map((v) => (v.id === updatedVis.id ? { ...v, ...updatedVis } : v)));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newInc = payload.new as Incident;
            setIncidents((prev) => (prev.some((i) => i.id === newInc.id) ? prev : [newInc, ...prev]));
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
            setReservations((prev) => (prev.some((r) => r.id === newRes.id) ? prev : [newRes, ...prev]));
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
            setAnnouncements((prev) => (prev.some((a) => a.id === newAnn.id) ? prev : [newAnn, ...prev]));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old?.id;
            if (oldId) setAnnouncements((prev) => prev.filter((a) => a.id !== oldId));
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

    const newAnnouncement: Announcement = {
      id: Date.now(),
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

    setAnnouncements((prev) => [newAnnouncement, ...prev]);

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
      }).then();
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
