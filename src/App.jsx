import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import AppLayout from './components/layout/AppLayout';
import GuestLayout from './components/layout/GuestLayout';
import PasswordRecoveryScreen from './components/layout/PasswordRecoveryScreen';import { initCapacitorNotifications } from './capacitor';
import { requestAppNotificationPermission } from './lib/appNotifications';
// Super Admin views
import { SuperAdminDashboard } from './components/views/super/SuperAdminDashboard';
import { ComplexesView } from './components/views/super/ComplexesView';
import { AdminsView } from './components/views/super/AdminsView';
import { SuperUsersView } from './components/views/super/SuperUsersView';
import { SubscriptionsView } from './components/views/super/SubscriptionsView';

// Admin views
import { AdminDashboard } from './components/views/admin/AdminDashboard';
import { PendingResidentsView } from './components/views/admin/PendingResidentsView';
import { ApartmentsView } from './components/views/admin/ApartmentsView';
import { ResidentsDirectoryView } from './components/views/admin/ResidentsDirectoryView';
import { AnnouncementsView } from './components/views/admin/AnnouncementsView';
import { IncidentsView } from './components/views/admin/IncidentsView';
import { ReservationsView } from './components/views/admin/ReservationsView';
import { VisitorsLogView } from './components/views/admin/VisitorsLogView';
import { GuardsView } from './components/views/admin/GuardsView';
import { AuditsView } from './components/views/admin/AuditsView';
import { ReportsView } from './components/views/admin/ReportsView';

// Resident views
import { ResidentDashboard } from './components/views/resident/ResidentDashboard';
import { MyApartmentView } from './components/views/resident/MyApartmentView';
import { ResidentAnnouncementsView } from './components/views/resident/ResidentAnnouncementsView';
import { ResidentVisitorsView } from './components/views/resident/ResidentVisitorsView';
import { ResidentReservationsView } from './components/views/resident/ResidentReservationsView';
import { ReportIncidentView } from './components/views/resident/ReportIncidentView';

// Guard views
import { GuardDashboard } from './components/views/guard/GuardDashboard';
import { GuardVisitorValidatorView } from './components/views/guard/GuardVisitorValidatorView';
import { GuardDirectoryView } from './components/views/guard/GuardDirectoryView';

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
  ],
  resident: [
    'resident_dashboard',
    'resident_apartment',
    'resident_announcements',
    'resident_visitors',
    'resident_reservations',
    'resident_incidents',
  ],
  guard: [
    'guard_dashboard',
    'guard_validator',
    'guard_directory',
  ],
};

function AuthenticatedApp() {
  const { currentUser, logout } = useAuth();
  const [currentView, setCurrentView] = useState(
    DEFAULT_VIEWS[currentUser?.role] || 'admin_dashboard'
  );

  React.useEffect(() => {
    if (!currentUser || !currentUser.role) return;
    const allowedViews = ROLE_VIEWS[currentUser.role] || [];
    if (!allowedViews.includes(currentView)) {
      setCurrentView(DEFAULT_VIEWS[currentUser.role]);
    }
  }, [currentUser, currentView]);

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
            <h2 className="text-lg font-semibold text-slate-900">Acceso no autorizado</h2>
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
      {renderView()}
    </AppLayout>
  );
}

function AppContent() {
  const { currentUser, isLoading } = useAuth();
  const [recoveryMode, setRecoveryMode] = useState(false);

  React.useEffect(() => {
    initCapacitorNotifications();
    if (currentUser && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      requestAppNotificationPermission();
    }
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-white/90 px-8 py-6 shadow-lg shadow-emerald-500/10">
          <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-sm text-emerald-700 font-medium">Cargando...</p>
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
        <GuestLayout onLogin={() => {}} />
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
