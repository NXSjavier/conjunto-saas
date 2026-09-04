// === Enums/Tipos Principales ===
// Cada tipo es un array de strings para facilitar iteración

export const ROLES = ['super_admin', 'admin', 'resident', 'guard'];

export const PLAN_TYPES = ['free', 'pro', 'enterprise'];

export const COMPLEX_STATUSES = ['active', 'blocked'];
export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'past_due', 'blocked'];
export const USER_STATUSES = ['active', 'pending', 'blocked'];
export const APARTMENT_STATUSES = ['available', 'occupied', 'maintenance'];
export const INCIDENT_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
export const INCIDENT_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const RESERVATION_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
export const VISITOR_STATUSES = ['registered', 'confirmed', 'in', 'out', 'rejected'];

// === Plan Limits — sincronizado con GuestLayout (login) ===
export const PLAN_LIMITS = {
  free: {
    name: 'Plan Gratuito',
    price: '$0 / 30 días',
    max_apartments: 50,
    max_guards: 2,
    max_areas: 1,
    features: [
      'Gestión básica de residentes y apartamentos',
      'Pases de visitantes por QR o código',
      'Anuncios y comunicaciones del conjunto',
      '1 área común para reservas sencillas',
      'Acceso básico a portería para control de ingreso',
    ],
  },
  pro: {
    name: 'Plan Pro',
    price: '$30 / mes',
    max_apartments: 200,
    max_guards: 5,
    max_areas: 5,
    features: [
      'Hasta 5 áreas comunes con reservas por calendario y horario',
      'Dashboard de métricas para visitantes, incidencias y reservas',
      'Portería avanzada con validación de ingreso/salida y seguimiento diario',
      'Reportes y control operativo para administración del conjunto',
      'Soporte prioritario por WhatsApp para operación continua',
    ],
  },
  enterprise: {
    name: 'Plan Enterprise',
    price: '$100 / mes',
    max_apartments: 9999,
    max_guards: 999,
    max_areas: 999,
    features: [
      'Escala para comunidades grandes con capacidad ampliada',
      'Múltiples guardas y control completo de acceso por portería',
      'Auditoría, reportes y seguimiento avanzado del conjunto',
      'Gestión operativa robusta para varias zonas y turnos',
      'Atención premium y soporte prioritario para administración total',
    ],
  },
};
