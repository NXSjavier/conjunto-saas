import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// Layouts
import { GuestLayout } from './components/layout/GuestLayout';
import { AppLayout } from './components/layout/AppLayout';

// Admin Views
import { AdminDashboard } from './components/views/admin/AdminDashboard';
import { PendingResidentsView } from './components/views/admin/PendingResidentsView';
import { BlocksView } from './components/views/admin/BlocksView';
import { ApartmentsView } from './components/views/admin/ApartmentsView';
import { ResidentsDirectoryView } from './components/views/admin/ResidentsDirectoryView';
import { AnnouncementsView } from './components/views/admin/AnnouncementsView';
import { IncidentsView } from './components/views/admin/IncidentsView';
import { ReservationsView } from './components/views/admin/ReservationsView';
import { VisitorsLogView } from './components/views/admin/VisitorsLogView';
import { GuardsView } from './components/views/admin/GuardsView';
import { AuditsView } from './components/views/admin/AuditsView';
import { ReportsView } from './components/views/admin/ReportsView';

// Resident Views
import { ResidentDashboard } from './components/views/resident/ResidentDashboard';
import { MyApartmentView } from './components/views/resident/MyApartmentView';
import { ResidentVisitorsView } from './components/views/resident/ResidentVisitorsView';
import { ResidentReservationsView } from './components/views/resident/ResidentReservationsView';
import { ReportIncidentView } from './components/views/resident/ReportIncidentView';

// Guard Views
import { GuardDashboard } from './components/views/guard/GuardDashboard';
import { GuardVisitorValidatorView } from './components/views/guard/GuardVisitorValidatorView';
import { GuardDirectoryView } from './components/views/guard/GuardDirectoryView';

// Super Admin Views
import { SuperAdminDashboard } from './components/views/super/SuperAdminDashboard';
import { ComplexesView } from './components/views/super/ComplexesView';
import { AdminsView } from './components/views/super/AdminsView';
import { SubscriptionsView } from './components/views/super/SubscriptionsView';
import { SuperUsersView } from './components/views/super/SuperUsersView';

const AppContent: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('admin_dashboard');

  // Sync initial view when role changes
  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'super_admin') {
      setCurrentView((prev) => (prev.startsWith('super_') ? prev : 'super_dashboard'));
    } else if (currentUser.role === 'admin') {
      setCurrentView((prev) => (prev.startsWith('admin_') ? prev : 'admin_dashboard'));
    } else if (currentUser.role === 'resident') {
      setCurrentView((prev) => (prev.startsWith('resident_') ? prev : 'resident_dashboard'));
    } else if (currentUser.role === 'guard') {
      setCurrentView((prev) => (prev.startsWith('guard_') ? prev : 'guard_dashboard'));
    }
  }, [currentUser?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="font-bold text-sm tracking-tight">Cargando Conjuntos App...</span>
      </div>
    );
  }

  // If user is not logged in, render GuestLayout with Login / Register flows
  if (!currentUser) {
    return <GuestLayout />;
  }

  // Render view inside AppLayout
  const renderCurrentView = () => {
    switch (currentView) {
      // Super Admin Views
      case 'super_dashboard':
        return <SuperAdminDashboard onNavigate={setCurrentView} />;
      case 'super_complexes':
        return <ComplexesView />;
      case 'super_admins':
        return <AdminsView />;
      case 'super_users':
        return <SuperUsersView />;
      case 'super_subscriptions':
        return <SubscriptionsView />;

      // Admin Views
      case 'admin_dashboard':
        return <AdminDashboard onNavigate={setCurrentView} />;
      case 'admin_pending':
        return <PendingResidentsView />;
      case 'admin_blocks':
        return <BlocksView />;
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

      // Resident Views
      case 'resident_dashboard':
        return <ResidentDashboard onNavigate={setCurrentView} />;
      case 'resident_apartment':
        return <MyApartmentView />;
      case 'resident_announcements':
        return <AnnouncementsView />;
      case 'resident_visitors':
        return <ResidentVisitorsView />;
      case 'resident_reservations':
        return <ResidentReservationsView />;
      case 'resident_incidents':
        return <ReportIncidentView />;

      // Guard Views
      case 'guard_dashboard':
        return <GuardDashboard onNavigate={setCurrentView} />;
      case 'guard_validator':
        return <GuardVisitorValidatorView />;
      case 'guard_directory':
        return <GuardDirectoryView />;

      default:
        if (currentUser.role === 'super_admin') return <SuperAdminDashboard onNavigate={setCurrentView} />;
        if (currentUser.role === 'resident') return <ResidentDashboard onNavigate={setCurrentView} />;
        if (currentUser.role === 'guard') return <GuardDashboard onNavigate={setCurrentView} />;
        return <AdminDashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <AppLayout currentView={currentView} onNavigate={setCurrentView}>
      {renderCurrentView()}
    </AppLayout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
}
