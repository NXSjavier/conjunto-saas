import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AppLayout from './components/layout/AppLayout';
import GuestLayout from './components/layout/GuestLayout';
import SetupWizard from './components/layout/SetupWizard';
import PasswordRecoveryScreen from './components/layout/PasswordRecoveryScreen';
import { supabase } from './lib/supabaseClient';
// ✅ Importar funciones de notificaciones (solo banner foreground, el SW/PushNotifications maneja las push cerradas)
import { onPushMessage } from './lib/firebase';
// ✅ Importar utilidades de PWA
import { isPwaInstalled, pingServiceWorker } from './pwa';

// Vistas por rol (lazy: cada rol descarga solo su chunk)
const named = (fn, name) => lazy(() => fn().then((m) => ({ default: m[name] })));

// Super Admin views
const SuperAdminDashboard = named(() => import('./components/views/super/SuperAdminDashboard'), 'SuperAdminDashboard');
const ComplexesView = named(() => import('./components/views/super/ComplexesView'), 'ComplexesView');
const AdminsView = named(() => import('./components/views/super/AdminsView'), 'AdminsView');
const SuperUsersView = named(() => import('./components/views/super/SuperUsersView'), 'SuperUsersView');
const SubscriptionsView = named(() => import('./components/views/super/SubscriptionsView'), 'SubscriptionsView');

// Admin views
const AdminDashboard = named(() => import('./components/views/admin/AdminDashboard'), 'AdminDashboard');
const PendingResidentsView = named(() => import('./components/views/admin/PendingResidentsView'), 'PendingResidentsView');
const ApartmentsView = named(() => import('./components/views/admin/ApartmentsView'), 'ApartmentsView');
const ResidentsDirectoryView = named(() => import('./components/views/admin/ResidentsDirectoryView'), 'ResidentsDirectoryView');
const AnnouncementsView = named(() => import('./components/views/admin/AnnouncementsView'), 'AnnouncementsView');
const IncidentsView = named(() => import('./components/views/admin/IncidentsView'), 'IncidentsView');
const ReservationsView = named(() => import('./components/views/admin/ReservationsView'), 'ReservationsView');
const VisitorsLogView = named(() => import('./components/views/admin/VisitorsLogView'), 'VisitorsLogView');
const GuardsView = named(() => import('./components/views/admin/GuardsView'), 'GuardsView');
const AuditsView = named(() => import('./components/views/admin/AuditsView'), 'AuditsView');
const ReportsView = named(() => import('./components/views/admin/ReportsView'), 'ReportsView');
const BillingView = named(() => import('./components/views/admin/BillingView'), 'BillingView');

// Resident views
const ResidentDashboard = named(() => import('./components/views/resident/ResidentDashboard'), 'ResidentDashboard');
const MyApartmentView = named(() => import('./components/views/resident/MyApartmentView'), 'MyApartmentView');
const ResidentAnnouncementsView = named(() => import('./components/views/resident/ResidentAnnouncementsView'), 'ResidentAnnouncementsView');
const ResidentVisitorsView = named(() => import('./components/views/resident/ResidentVisitorsView'), 'ResidentVisitorsView');
const ResidentReservationsView = named(() => import('./components/views/resident/ResidentReservationsView'), 'ResidentReservationsView');
const ReportIncidentView = named(() => import('./components/views/resident/ReportIncidentView'), 'ReportIncidentView');

// Guard views
const GuardDashboard = named(() => import('./components/views/guard/GuardDashboard'), 'GuardDashboard');
const GuardVisitorValidatorView = named(() => import('./components/views/guard/GuardVisitorValidatorView'), 'GuardVisitorValidatorView');
const GuardDirectoryView = named(() => import('./components/views/guard/GuardDirectoryView'), 'GuardDirectoryView');

// Shared views
const GuideView = named(() => import('./components/views/shared/GuideView'), 'GuideView');
const NotificationsView = named(() => import('./components/views/shared/NotificationsView'), 'NotificationsView');

const DEFAULT_VIEWS = {
  super_admin: 'super_dashboard',
  admin: 'admin_dashboard',
  resident: 'resident_dashboard',
  guard: 'guard_dashboard',
};

const ROLE_VIEWS = {
  super_admin: [
    'super_dashboard',
    'super_complexes',
    'super_admins',
    'super_users',
    'super_subscriptions',
    'notifications',
    'app_guide',
  ],
  admin: [
    'admin_dashboard',
    'admin_pending',
    'admin_apartments',
    'admin_residents',
    'admin_announcements',
    'admin_incidents',
    'admin_reservations',
    'admin_visitors',
    'admin_guards',
    'admin_audits',
    'admin_reports',
    'admin_billing',
    'notifications',
    'app_guide',
  ],
  resident: [
    'resident_dashboard',
    'resident_apartment',
    'resident_announcements',
    'resident_visitors',
    'resident_reservations',
    'resident_incidents',
    'notifications',
    'app_guide',
  ],
  guard: [
    'guard_dashboard',
    'guard_validator',
    'guard_directory',
    'notifications',
    'app_guide',
  ],
};

function AuthenticatedApp() {
  const { currentUser, logout } = useAuth();
  const [currentView, setCurrentView] = useState(
    DEFAULT_VIEWS[currentUser?.role] || 'admin_dashboard'
  );
  // ✅ Estado para la notificación en foreground
  const [foregroundNotification, setForegroundNotification] = useState(null);
  // ✅ Referencia para el listener de notificaciones
  const unsubscribeRef = useRef(null);
  // ✅ Estado para saber si la app está visible
  const [isAppVisible, setIsAppVisible] = useState(true);

  // ✅ Detectar cuando la app pasa a segundo plano o se cierra
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setIsAppVisible(isVisible);
      console.log(`📱 App ${isVisible ? 'visible (foreground)' : 'oculta (background)'}`);
      
      // ✅ Si la app está en segundo plano, el SW debe tomar el control
      if (!isVisible && isPwaInstalled()) {
        console.log('📱 PWA en segundo plano - SW debe manejar notificaciones');
        // Hacer un ping al SW para asegurar que está vivo
        pingServiceWorker().then((result) => {
          if (!result) {
            console.warn('⚠️ SW no responde, intentando reactivar...');
            // Forzar reactivación del SW
            navigator.serviceWorker.getRegistration('/').then(reg => {
              if (reg) {
                reg.update().catch(() => {});
              }
            });
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Banner interno cuando llega push en foreground (la notificación del sistema la muestra pushNotifications.ts)
  useEffect(() => {
    console.log('📨 [App] Iniciando banner foreground...');

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    const unsubscribe = onPushMessage((payload) => {
      console.log('📨 [App] Banner foreground recibido:', payload);
      const title = payload.notification?.title || 'Residex';
      const body = payload.notification?.body || '';
      const url = payload.data?.url || '/';
      const image = payload.notification?.image || payload.data?.image || null;
      setForegroundNotification({
        title,
        body,
        url,
        image,
        payload,
        timestamp: Date.now()
      });
    });

    unsubscribeRef.current = unsubscribe;
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        console.log('🧹 [App] Banner foreground limpiado');
      }
    };
  }, []);

  // ✅ Resetear notificación después de 10 segundos
  useEffect(() => {
    if (foregroundNotification) {
      const timer = setTimeout(() => {
        setForegroundNotification(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [foregroundNotification]);

  const handleNavigate = (view) => {
    const allowedViews = ROLE_VIEWS[currentUser?.role] || [];
    if (allowedViews.length > 0 && !allowedViews.includes(view)) {
      return;
    }
    setCurrentView(view);
  };

  const renderView = () => {
    const permittedViews = ROLE_VIEWS[currentUser?.role] || [];
    if (!permittedViews.includes(currentView)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-slate-100">Acceso no autorizado</h2>
            <p className="text-sm text-slate-500 mt-1">No tienes permisos para ver esta vista.</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      // Super Admin
      case 'super_dashboard':
        return <SuperAdminDashboard onNavigate={handleNavigate} />;
      case 'super_complexes':
        return <ComplexesView />;
      case 'super_admins':
        return <AdminsView />;
      case 'super_users':
        return <SuperUsersView />;
      case 'super_subscriptions':
        return <SubscriptionsView />;

      // Admin
      case 'admin_dashboard':
        return <AdminDashboard onNavigate={handleNavigate} />;
      case 'admin_pending':
        return <PendingResidentsView />;
      case 'admin_apartments':
        return <ApartmentsView />;
      case 'admin_residents':
        return <ResidentsDirectoryView />;
      case 'admin_announcements':
        return <AnnouncementsView />;
      case 'admin_incidents':
        return <IncidentsView />;
      case 'admin_reservations':
        return <ReservationsView />;
      case 'admin_visitors':
        return <VisitorsLogView />;
      case 'admin_guards':
        return <GuardsView />;
      case 'admin_audits':
        return <AuditsView />;
      case 'admin_reports':
        return <ReportsView />;
      case 'admin_billing':
        return <BillingView />;

      // Resident
      case 'resident_dashboard':
        return <ResidentDashboard onNavigate={handleNavigate} />;
      case 'resident_apartment':
        return <MyApartmentView />;
      case 'resident_announcements':
        return <ResidentAnnouncementsView />;
      case 'resident_visitors':
        return <ResidentVisitorsView />;
      case 'resident_reservations':
        return <ResidentReservationsView />;
      case 'resident_incidents':
        return <ReportIncidentView />;

      // Guard
      case 'guard_dashboard':
        return <GuardDashboard onNavigate={handleNavigate} />;
      case 'guard_validator':
        return <GuardVisitorValidatorView />;
      case 'guard_directory':
        return <GuardDirectoryView />;

      // Shared
      case 'notifications':
        return <NotificationsView />;
      case 'app_guide':
        return <GuideView />;

      default:
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-200">Página no encontrada</h2>
              <p className="text-sm text-slate-500 mt-1">La vista solicitada no existe.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout
      currentView={currentView}
      onNavigate={handleNavigate}
      onLogout={logout}
    >
      {/* ✅ Mostrar notificación en foreground como un banner/toast */}
      {foregroundNotification && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto animate-slide-down">
          <div className="bg-surface-900 rounded-card shadow-2xl border border-brand-500/30 p-4 flex items-start gap-3">
            {/* Ícono */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            
            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">
                {foregroundNotification.title}
              </p>
              <p className="text-sm text-slate-400 truncate">
                {foregroundNotification.body}
              </p>
              {foregroundNotification.url && foregroundNotification.url !== '/' && (
                <p className="text-xs text-brand-400 mt-1 truncate">
                  🔗 {foregroundNotification.url}
                </p>
              )}
            </div>
            
            {/* Botón cerrar */}
            <button
              onClick={() => setForegroundNotification(null)}
              className="flex-shrink-0 text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm text-brand-400 font-medium">Cargando vista...</p>
            </div>
          </div>
        }
      >
        {renderView()}
      </Suspense>
    </AppLayout>
  );
}

function SetupGate({ needsSetup, setNeedsSetup }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('bootstrap-setup', {
          body: { action: 'status' },
        });
        if (!cancelled) {
          // Si la función no existe o falla, asumir que ya está configurado (no bloquear login)
          setNeedsSetup(error ? false : !!data?.needsSetup);
        }
      } catch {
        if (!cancelled) setNeedsSetup(false);
      } finally {
        if (!cancelled) setChecked(true);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [setNeedsSetup]);

  if (!checked || needsSetup === null) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-panel border border-slate-800 bg-surface-900 px-8 py-6 shadow-card">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-brand-400 font-medium">Verificando...</p>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupWizard onDone={() => setNeedsSetup(false)} />;
  }

  return <GuestLayout onLogin={() => {}} />;
}

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(null); // null = verificando, true/false = resultado
  // ✅ Referencia para mensajes del SW
  const swMessageHandlerRef = useRef(null);

  // ✅ Escuchar mensajes del Service Worker (para cuando la app se abre desde una notificación)
  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        console.log('🔔 [App] Click en notificación desde SW:', event.data);
        
        const { payload, url } = event.data;
        
        // ✅ Mostrar mensaje en la UI
        const title = payload?.notification?.title || 'Notificación';
        const body = payload?.notification?.body || '';
        
        console.log(`📨 [App] Abierto desde notificación: ${title} - ${body}`);
        
        // ✅ Navegar a la URL después de 1 segundo
        if (url && url !== window.location.pathname) {
          setTimeout(() => {
            window.location.href = url;
          }, 1000);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      // ✅ Remover listener anterior si existe
      if (swMessageHandlerRef.current) {
        navigator.serviceWorker.removeEventListener('message', swMessageHandlerRef.current);
      }
      
      swMessageHandlerRef.current = handleServiceWorkerMessage;
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator && swMessageHandlerRef.current) {
        navigator.serviceWorker.removeEventListener('message', swMessageHandlerRef.current);
        swMessageHandlerRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-panel border border-slate-800 bg-surface-900 px-8 py-6 shadow-card">
          <div className="w-10 h-10 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-brand-400 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (recoveryMode) {
    return <PasswordRecoveryScreen onBack={() => setRecoveryMode(false)} />;
  }

  if (!currentUser) {
    return (
      <DataProvider>
        <SetupGate needsSetup={needsSetup} setNeedsSetup={setNeedsSetup} />
      </DataProvider>
    );
  }

  return (
    <DataProvider>
      <AuthenticatedApp />
    </DataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}