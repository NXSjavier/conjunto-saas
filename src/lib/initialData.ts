import {
  Role,
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
  NotificationItem,
} from '../types';

export const INITIAL_ROLES: Role[] = [
  { id: 1, slug: 'super_admin', name: 'Super Admin' },
  { id: 2, slug: 'admin', name: 'Administrador' },
  { id: 3, slug: 'resident', name: 'Residente' },
  { id: 4, slug: 'guard', name: 'Guardia' },
];

export const INITIAL_COMPLEXES: ResidentialComplex[] = [
  {
    id: 1,
    name: 'Las Palmas',
    code: 'LP-2026-X8T5',
    address: 'Av. Principal 100',
    city: 'Ciudad',
    phone: '+1 555-0100',
    status: 'active',
    plan: 'pro',
    subscription_status: 'active',
    trial_ends_at: '2026-12-31T00:00:00Z',
    current_period_end: '2026-12-31T00:00:00Z',
    subscription_notes: 'Plan Activo',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_USERS: User[] = [
  {
    id: 'f6fd1eed-956f-45e3-862b-5271671bb2b8',
    name: 'Super Admin',
    email: 'superadmin@conjuntos.app',
    role_id: 1,
    role: 'super_admin',
    residential_complex_id: null,
    phone: '+1 555-0100',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '6f414b52-e330-44ec-b4b1-839651ccfd81',
    name: 'Admin',
    email: 'admin@lp.app',
    role_id: 2,
    role: 'admin',
    residential_complex_id: 1,
    phone: '+1 555-0111',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '98bb71c2-2274-4ae1-9fb3-3cdf3c1d4788',
    name: 'Guardia',
    email: 'guardia@lp.app',
    role_id: 4,
    role: 'guard',
    residential_complex_id: 1,
    phone: '+1 555-0199',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ca80c2cd-3d2b-4c74-b954-c0c586f7aaf5',
    name: 'Residente',
    email: 'residente@lp.app',
    role_id: 3,
    role: 'resident',
    residential_complex_id: 1,
    apartment_id: 1,
    apartment_number: '101',
    phone: '+1 555-0144',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_BLOCKS: ApartmentBlock[] = [
  {
    id: 1,
    residential_complex_id: 1,
    name: 'Torre 1',
    description: 'Torre Residencial Principal',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_APARTMENTS: Apartment[] = [
  {
    id: 1,
    residential_complex_id: 1,
    apartment_block_id: 1,
    number: '101',
    floor: '1',
    resident_name: 'Residente',
    status: 'occupied',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_GUARDS: Guard[] = [
  {
    id: 1,
    user_id: '98bb71c2-2274-4ae1-9fb3-3cdf3c1d4788',
    residential_complex_id: 1,
    name: 'Guardia',
    phone: '+1 555-0199',
    shift: 'Turno Día',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];
export const INITIAL_COMMENTS: AnnouncementComment[] = [];
export const INITIAL_INCIDENTS: Incident[] = [];
export const INITIAL_RESERVATIONS: Reservation[] = [];
export const INITIAL_VISITORS: Visitor[] = [];
export const INITIAL_AUDITS: any[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
