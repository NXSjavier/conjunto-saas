import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NotificationBell } from '../ui/NotificationBell';
import { cn, daysUntilExpiry } from '../../lib/utils';
import { enablePushFromGesture, getPushStatus, initPushNotifications, sendPushToUser } from '../../lib/pushNotifications';
import {
  Building2,
  LayoutDashboard,
  Users,
  UserCheck,
  Building,
  Megaphone,
  AlertTriangle,
  Calendar,
  QrCode,
  Shield,
  FileText,
  LogOut,
  Menu,
  X,
  Home,
  DoorOpen,
  ClipboardList,
  Phone,
  Lock,
  BookOpen,
  Bell,
} from 'lucide-react';

const NAV_ITEMS = {
  super_admin: [
    { id: 'super_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'super_complexes', label: 'Conjuntos', icon: Building2 },
    { id: 'super_admins', label: 'Administradores', icon: Shield },
    { id: 'super_users', label: 'Usuarios', icon: Users },
    { id: 'super_subscriptions', label: 'Suscripciones', icon: FileText },
    { id: 'app_guide', label: 'Guía de Uso', icon: BookOpen },
  ],
  admin: [
    { id: 'admin_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'admin_pending', label: 'Pendientes', icon: UserCheck, badge: 'pending' },
    { id: 'admin_apartments', label: 'Apartamentos', icon: DoorOpen },
    { id: 'admin_residents', label: 'Residentes', icon: Users },
    { id: 'admin_announcements', label: 'Anuncios', icon: Megaphone },
    { id: 'admin_incidents', label: 'Incidencias', icon: AlertTriangle },
    { id: 'admin_reservations', label: 'Reservas', icon: Calendar },
    { id: 'admin_visitors', label: 'Visitas', icon: Phone },
    { id: 'admin_guards', label: 'Guardas', icon: Shield },
    { id: 'admin_audits', label: 'Auditorías', icon: ClipboardList },
    { id: 'admin_reports', label: 'Reportes', icon: FileText },
    { id: 'app_guide', label: 'Guía de Uso', icon: BookOpen },
  ],
  resident: [
    { id: 'resident_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'resident_apartment', label: 'Mi Apartamento', icon: Home },
    { id: 'resident_announcements', label: 'Anuncios', icon: Megaphone },
    { id: 'resident_visitors', label: 'Visitantes', icon: Phone },
    { id: 'resident_reservations', label: 'Reservas', icon: Calendar },
    { id: 'resident_incidents', label: 'Incidentes', icon: AlertTriangle },
    { id: 'app_guide', label: 'Guía de Uso', icon: BookOpen },
  ],
  guard: [
    { id: 'guard_dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'app_guide', label: 'Guía de Uso', icon: BookOpen },
  ],
};

const MOBILE_ITEMS = {
  super_admin: [
    { id: 'super_dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'super_complexes', label: 'Conjuntos', icon: Building2 },
    { id: 'super_users', label: 'Usuarios', icon: Users },
    { id: 'super_subscriptions', label: 'Planes', icon: FileText },
    { id: 'app_guide', label: 'Guía', icon: BookOpen },
  ],
  admin: [
    { id: 'admin_dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'admin_pending', label: 'Pendientes', icon: UserCheck },
    { id: 'admin_announcements', label: 'Avisos', icon: Megaphone },
    { id: 'admin_residents', label: 'Residentes', icon: Users },
    { id: 'app_guide', label: 'Guía', icon: BookOpen },
  ],
  resident: [
    { id: 'resident_dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'resident_announcements', label: 'Avisos', icon: Megaphone },
    { id: 'resident_visitors', label: 'Visitas', icon: Phone },
    { id: 'resident_reservations', label: 'Reservas', icon: Calendar },
    { id: 'app_guide', label: 'Guía', icon: BookOpen },
  ],
  guard: [
    { id: 'guard_dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'app_guide', label: 'Guía', icon: BookOpen },
  ],
};

function getBadgeCount(item, users) {
  if (item.badge === 'pending') {
    return users.filter((u) => u.status === 'pending').length;
  }
  return 0;
}

export default function AppLayout({ children, currentView, onNavigate, onLogout }) {
  const { currentUser, currentComplex } = useAuth();
  const { users, notifications, markAllNotificationsAsRead, clearNotifications } = useData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pushStatus, setPushStatus] = useState('checking');
  const [pushLoading, setPushLoading] = useState(false);
  const [pushTesting, setPushTesting] = useState(false);

  // Estado de push para ESTE dispositivo. Si el permiso ya está otorgado pero
  // este dispositivo aún no tiene token, se registra en silencio.
  useEffect(() => {
    const authId = currentUser?.auth_user_id;
    const check = async () => {
      let s = getPushStatus(authId);
      if (s === 'ready' && authId) {
        const ok = await initPushNotifications(authId).catch(() => false);
        if (ok) s = getPushStatus(authId);
      }
      setPushStatus(s);
    };
    check();
  }, [currentUser?.auth_user_id]);

  const handleEnablePush = async () => {
    if (!currentUser?.auth_user_id) return;
    setPushLoading(true);
    const ok = await enablePushFromGesture(currentUser.auth_user_id).catch(() => false);
    setPushStatus(getPushStatus(currentUser.auth_user_id));
    setPushLoading(false);
    return ok;
  };

  const handleTestPush = async () => {
    if (!currentUser?.id) return;
    setPushTesting(true);
    await sendPushToUser(currentUser.id, 'Prueba de notificación', 'Si ves esto, las push funcionan en este dispositivo.');
    setPushTesting(false);
  };

  const role = currentUser?.role || 'resident';
  const navItems = NAV_ITEMS[role] || [];
  const mobileItems = MOBILE_ITEMS[role] || [];

  const planTheme = {
    free: {
      pageBg: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 40%, #ecfdf5 100%)',
      panelBg: 'rgba(255,255,255,0.85)',
      panelBorder: 'rgba(16,185,129,0.20)',
      accent: '#10b981',
      accentSoft: 'rgba(16,185,129,0.12)',
      hover: 'rgba(16,185,129,0.08)',
      text: '#0f172a',
      muted: '#475569',
      topBar: 'rgba(255,255,255,0.78)',
      mobileBg: 'rgba(255,255,255,0.9)',
    },
    pro: {
      pageBg: 'radial-gradient(circle at top, #082f49 0%, #111827 36%, #020817 100%)',
      panelBg: 'rgba(15,23,42,0.85)',
      panelBorder: 'rgba(34,211,238,0.30)',
      accent: '#22d3ee',
      accentSoft: 'rgba(34,211,238,0.14)',
      hover: 'rgba(34,211,238,0.08)',
      text: '#e2e8f0',
      muted: '#94a3b8',
      topBar: 'rgba(15,23,42,0.82)',
      mobileBg: 'rgba(15,23,42,0.90)',
    },
    enterprise: {
      pageBg: 'radial-gradient(circle at top, #1f1137 0%, #0f172a 36%, #020617 100%)',
      panelBg: 'rgba(15,23,42,0.88)',
      panelBorder: 'rgba(168,85,247,0.32)',
      accent: '#a78bfa',
      accentSoft: 'rgba(168,85,247,0.14)',
      hover: 'rgba(168,85,247,0.08)',
      text: '#f5f3ff',
      muted: '#c4b5fd',
      topBar: 'rgba(15,23,42,0.84)',
      mobileBg: 'rgba(15,23,42,0.92)',
    },
  };

  const activeTheme = planTheme[currentComplex?.plan] || planTheme.free;

  const isExpired = currentComplex
    ? daysUntilExpiry(currentComplex.subscription_expiry) <= 0
    : false;
  const isBlocked = currentComplex?.status === 'blocked' || currentComplex?.subscription_status === 'blocked';
  const showLockScreen = (isExpired || isBlocked) && role !== 'super_admin';

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: activeTheme.panelBg, color: activeTheme.text }}>
      <div className="px-5 py-6 border-b" style={{ borderColor: activeTheme.panelBorder }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: activeTheme.accentSoft, color: activeTheme.accent }}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ color: activeTheme.text }}>Conjuntos App</h1>
            <p className="text-[11px] truncate max-w-[140px]" style={{ color: activeTheme.muted }}>
              {currentComplex?.name || 'Panel Admin'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const badgeCount = getBadgeCount(item, users);

          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer',
              )}
              style={
                isActive
                  ? {
                      background: activeTheme.accentSoft,
                      color: activeTheme.accent,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
                    }
                  : {
                      color: activeTheme.muted,
                      background: 'transparent',
                    }
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {badgeCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold">
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        {pushStatus === 'needs-enable' && (
          <button
            disabled={pushLoading}
            onClick={handleEnablePush}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer shadow-sm"
          >
            <Bell className="w-4 h-4" />
            <span>{pushLoading ? 'Activando...' : 'Activar Notificaciones'}</span>
          </button>
        )}
        {pushStatus === 'denied' && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            Notificaciones bloqueadas. Actívalas en los ajustes del navegador para este sitio.
          </p>
        )}
        {pushStatus === 'ready' && (
          <button
            disabled={pushTesting}
            onClick={handleTestPush}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50/60 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{pushTesting ? 'Enviando prueba...' : 'Notificaciones activas · Probar'}</span>
          </button>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-800 transition-all cursor-pointer shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: activeTheme.pageBg, color: activeTheme.text }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 backdrop-blur-md border-r z-40 shadow-lg"
        style={{
          background: activeTheme.panelBg,
          borderColor: activeTheme.panelBorder,
          boxShadow: `0 20px 40px ${activeTheme.accentSoft}`,
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-emerald-950/20 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 w-72 border-r z-50 shadow-2xl"
            style={{
              background: activeTheme.panelBg,
              borderColor: activeTheme.panelBorder,
              boxShadow: `0 20px 40px ${activeTheme.accentSoft}`,
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: activeTheme.panelBorder }}>
              <span className="text-sm font-bold" style={{ color: activeTheme.text }}>Menú</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg cursor-pointer"
                style={{ color: activeTheme.muted, background: activeTheme.hover }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Header */}
      <div className="hidden lg:flex lg:pl-64">
        <header
          className="fixed top-0 right-0 left-64 h-16 backdrop-blur-md border-b z-30 flex items-center justify-end px-4 sm:px-6"
          style={{
            background: activeTheme.topBar,
            borderColor: activeTheme.panelBorder,
            boxShadow: `0 10px 30px ${activeTheme.accentSoft}`,
          }}
        >
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {currentComplex?.code && (
              <span className="max-w-[140px] truncate text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-lg border" style={{ color: activeTheme.accent, background: activeTheme.accentSoft, borderColor: activeTheme.panelBorder }}>
                {currentComplex.code}
              </span>
            )}
            <NotificationBell
              notifications={notifications}
              onMarkAllRead={markAllNotificationsAsRead}
              onClearAll={clearNotifications}
            />
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs sm:text-sm font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors cursor-pointer shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="whitespace-nowrap">Cerrar sesión</span>
            </button>
          </div>
        </header>
      </div>

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 inset-x-0 h-14 backdrop-blur-md border-b z-30 flex items-center justify-between px-4"
        style={{
          background: activeTheme.mobileBg,
          borderColor: activeTheme.panelBorder,
        }}
      >
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl cursor-pointer"
          style={{ color: activeTheme.accent, background: activeTheme.hover }}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: activeTheme.accent }} />
          <span className="text-xs font-bold" style={{ color: activeTheme.text }}>Conjuntos App</span>
        </div>
        <NotificationBell
          notifications={notifications}
          onMarkAllRead={markAllNotificationsAsRead}
          onClearAll={clearNotifications}
        />
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Salir</span>
        </button>
      </div>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 pb-20 lg:pt-20 lg:pb-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {pushStatus === 'needs-enable' && (
            <div className="mb-4 flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-900">Recibe notificaciones en tu celular</p>
                <p className="text-xs text-emerald-600">Visitas, incidencias, avisos y más al instante</p>
              </div>
              <button
                disabled={pushLoading}
                onClick={handleEnablePush}
                className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-md"
              >
                {pushLoading ? '...' : 'Activar'}
              </button>
            </div>
          )}
          {pushStatus === 'denied' && (
            <div className="mb-4 flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Notificaciones bloqueadas en este dispositivo</p>
                <p className="text-xs text-amber-700">En Chrome: toca el candado al lado de la dirección → Permisos → Notificaciones → Permitir.</p>
              </div>
            </div>
          )}
          {showLockScreen ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-rose-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-100 mb-2">
                  {isExpired ? 'Suscripción Vencida' : 'Conjunto Bloqueado'}
                </h2>
                <p className="text-sm text-slate-400 mb-6">
                  {isExpired
                    ? 'Tu periodo de prueba ha expirado. Contacta al Super Admin para activar un plan de pago.'
                    : 'Tu conjunto ha sido bloqueado. Contacta al Super Admin para más información.'}
                </p>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 h-16 backdrop-blur-md border-t z-30 flex items-center justify-around px-2 safe-area-inset-bottom"
        style={{
          background: activeTheme.mobileBg,
          borderColor: activeTheme.panelBorder,
          boxShadow: `0 -10px 30px ${activeTheme.accentSoft}`,
        }}
      >
        {mobileItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] cursor-pointer"
              style={
                isActive
                  ? {
                      color: activeTheme.accent,
                      background: activeTheme.accentSoft,
                    }
                  : {
                      color: activeTheme.muted,
                    }
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
