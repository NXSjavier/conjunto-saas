export type RoleSlug = 'super_admin' | 'admin' | 'resident' | 'guard';

export interface Role {
  id: number;
  slug: RoleSlug;
  name: string;
}

export type ComplexStatus = 'active' | 'blocked';
export type PlanType = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'blocked';

export interface ResidentialComplex {
  id: number;
  name: string;
  code: string; // Ej: LP-2026-X8T5
  address: string;
  city: string;
  phone: string;
  status: ComplexStatus;
  plan: PlanType;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string;
  current_period_end: string;
  payment_receipt_path?: string;
  payment_receipt_uploaded_at?: string;
  subscription_notes?: string;
  settings?: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type UserStatus = 'active' | 'pending' | 'blocked';

export interface User {
  id: string; // uuid
  name: string;
  email: string;
  role_id: number;
  role?: RoleSlug;
  residential_complex_id?: number | null;
  requested_complex_id?: number | null;
  face_photo_path?: string;
  apartment_id?: number | null;
  apartment_number?: string;
  requested_block_or_apt?: string;
  phone?: string;
  avatar?: string;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface ApartmentBlock {
  id: number;
  residential_complex_id: number;
  name: string; // Ej: Torre A, Manzana 23
  description?: string;
  created_at: string;
  updated_at: string;
}

export type ApartmentStatus = 'available' | 'occupied' | 'maintenance';

export interface Apartment {
  id: number;
  residential_complex_id: number;
  apartment_block_id?: number | null;
  block_name?: string;
  number: string; // Ej: 101, Mz A Lt 5
  floor?: string;
  status: ApartmentStatus;
  resident_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Resident {
  id: number;
  user_id: string;
  residential_complex_id: number;
  apartment_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Guard {
  id: number;
  user_id: string;
  residential_complex_id: number;
  name: string;
  phone: string;
  shift?: string;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  residential_complex_id: number;
  title: string;
  body: string;
  published_by: string; // uuid
  author_name?: string;
  author_role?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export interface AnnouncementComment {
  id: number;
  announcement_id: number;
  user_id: string;
  residential_complex_id: number;
  author_name?: string;
  author_role?: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Incident {
  id: number;
  residential_complex_id: number;
  reported_by: string; // uuid
  reporter_name?: string;
  reporter_apartment?: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  attachments?: string[];
  created_at: string;
  updated_at: string;
}

export type ReservationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Reservation {
  id: number;
  residential_complex_id: number;
  user_id: string;
  user_name?: string;
  apartment_number?: string;
  area_name: string;
  date: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
}

export type VisitorStatus = 'registered' | 'confirmed' | 'in' | 'out' | 'rejected';

export interface Visitor {
  id: number;
  code: string; // Ej: 4829-1047
  residential_complex_id: number;
  guard_id?: number | null;
  guard_name?: string;
  name: string;
  document_number?: string;
  phone?: string;
  apartment_id?: number | null;
  apartment_number?: string;
  visiting_name: string;
  status: VisitorStatus;
  approved: boolean;
  check_in_at?: string | null;
  check_out_at?: string | null;
  created_by: string;
  requested_by: string;
  created_at: string;
  updated_at: string;
}

export interface Audit {
  id: number;
  user_id: string;
  user_name?: string;
  residential_complex_id?: number | null;
  complex_name?: string;
  action: string;
  auditable_type: string;
  auditable_id?: number | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  created_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface PlanConfig {
  name: string;
  price: number;
  priceText: string;
  maxApartments: number; // -1 for unlimited
  maxGuards: number;
  maxAreas: number;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanType, PlanConfig> = {
  free: {
    name: 'Free',
    price: 0,
    priceText: '$0 / 30 días',
    maxApartments: 50,
    maxGuards: 2,
    maxAreas: 1,
    features: ['50 Departamentos', '2 Guardias', '1 Área común', 'Soporte por Email'],
  },
  pro: {
    name: 'Pro',
    price: 24,
    priceText: '$24 / mes (~$96k COP)',
    maxApartments: 200,
    maxGuards: 5,
    maxAreas: 5,
    features: ['200 Departamentos', '5 Guardias', '5 Áreas comunes', 'Módulo de Reportes', 'Soporte WhatsApp'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 49,
    priceText: '$49 / mes (~$196k COP)',
    maxApartments: -1,
    maxGuards: -1,
    maxAreas: -1,
    features: ['Departamentos Ilimitados', 'Guardias Ilimitados', 'Áreas Ilimitadas', 'API & Webhooks', 'Soporte prioritario 24/7'],
  },
};
