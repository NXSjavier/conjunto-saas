import React, { useState } from 'react';
import {
  Building2,
  LayoutDashboard,
  Users,
  Shield,
  Key,
  CreditCard,
  Building,
  UserCheck,
  Megaphone,
  AlertTriangle,
  CalendarCheck,
  History,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Smartphone,
  Maximize2,
  Code2,
  Compass,
  QrCode,
  Home,
  CheckCircle2,
  Copy,
  Database,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Badge } from '../ui/Badge';
import { NotificationBell } from '../ui/NotificationBell';
import { FlashMessage } from '../ui/FlashMessage';
import { copyToClipboard } from '../../lib/utils';
import { soundEngine } from '../../lib/sound';

export interface AppLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  onNavigate,
  children,
}) => {
  const { currentUser, currentComplex, logout, loginAsRole } = useAuth();
  const { notifications, markAllNotificationsAsRead, clearNotifications, users, isSupabaseLive } = useData();

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isDeviceFrameMode, setIsDeviceFrameMode] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Pending resident count for admin badge
  const pendingResidentsCount = users.filter(
    (u) => u.requested_complex_id === currentComplex?.id && u.status === 'pending'
  ).length;

  const handleCopyComplexCode = async () => {
    if (!currentComplex?.code) return;
    const success = await copyToClipboard(currentComplex.code);
    if (success) {
      setCopiedCode(true);
      soundEngine.playSuccessChime();
      setFlash({ message: `Código ${currentComplex.code} copiado al portapapeles`, type: 'success' });
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Role Pill Config
  const roleConfigs = {
    super_admin: {
      label: 'Super Admin',
      pillClass: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
      badgeVariant: 'purple' as const,
      roleIcon: '👑',
    },
    admin: {
      label: 'Administrador',
      pillClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      badgeVariant: 'emerald' as const,
      roleIcon: '🏢',
    },
    resident: {
      label: 'Residente',
      pillClass: 'bg-sky-950/80 text-sky-300 border-sky-800/60',
      badgeVariant: 'sky' as const,
      roleIcon: '🏠',
    },
    guard: {
      label: 'Guardia Garita',
      pillClass: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      badgeVariant: 'amber' as const,
      roleIcon: '👮',
    },
  };

  const currentRole = currentUser?.role || 'admin';
  const roleInfo = roleConfigs[currentRole];

  // Navigation Items per Role
  const navSections = [
    ...(currentRole === 'super_admin'
      ? [
          {
            title: 'PANEL GLOBAL',
            items: [
              { id: 'super_dashboard', label: 'Dashboard Global', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'super_complexes', label: 'Conjuntos Residenciales', icon: <Building2 className="h-4 w-4" /> },
              { id: 'super_admins', label: 'Administradores', icon: <Users className="h-4 w-4" /> },
              { id: 'super_subscriptions', label: 'Suscripciones SaaS', icon: <CreditCard className="h-4 w-4" /> },
            ],
          },
        ]
      : []),

    ...(currentRole === 'admin'
      ? [
          {
            title: 'GESTIÓN PRINCIPAL',
            items: [
              { id: 'admin_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
              {
                id: 'admin_pending',
                label: 'Aprobar Residentes',
                icon: <UserCheck className="h-4 w-4" />,
                badge: pendingResidentsCount > 0 ? `${pendingResidentsCount}` : undefined,
              },
              { id: 'admin_blocks', label: 'Torres y Bloques', icon: <Building className="h-4 w-4" /> },
              { id: 'admin_apartments', label: 'Departamentos', icon: <Home className="h-4 w-4" /> },
              { id: 'admin_residents', label: 'Directorio Residentes', icon: <Users className="h-4 w-4" /> },
            ],
          },
          {
            title: 'OPERACIONES & SEGURIDAD',
            items: [
              { id: 'admin_announcements', label: 'Comunicados', icon: <Megaphone className="h-4 w-4" /> },
              { id: 'admin_incidents', label: 'Incidencias', icon: <AlertTriangle className="h-4 w-4" /> },
              { id: 'admin_reservations', label: 'Reservas Comunes', icon: <CalendarCheck className="h-4 w-4" /> },
              { id: 'admin_visitors', label: 'Bitácora Visitantes', icon: <History className="h-4 w-4" /> },
              { id: 'admin_guards', label: 'Guardias de Garita', icon: <Shield className="h-4 w-4" /> },
            ],
          },
          {
            title: 'SISTEMA & REPORTES',
            items: [
              { id: 'admin_reports', label: 'Reportes y Métricas', icon: <FileSpreadsheet className="h-4 w-4" /> },
              { id: 'admin_audits', label: 'Auditoría', icon: <Compass className="h-4 w-4" /> },
            ],
          },
        ]
      : []),

    ...(currentRole === 'resident'
      ? [
          {
            title: 'MI CONJUNTO',
            items: [
              { id: 'resident_dashboard', label: 'Inicio', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'resident_apartment', label: 'Mi Departamento', icon: <Home className="h-4 w-4" /> },
              { id: 'resident_announcements', label: 'Comunicados', icon: <Megaphone className="h-4 w-4" /> },
            ],
          },
          {
            title: 'SERVICIOS & VISITAS',
            items: [
              { id: 'resident_visitors', label: 'Generar Visita', icon: <QrCode className="h-4 w-4" /> },
              { id: 'resident_reservations', label: 'Reservar Áreas', icon: <CalendarCheck className="h-4 w-4" /> },
              { id: 'resident_incidents', label: 'Reportar Incidencia', icon: <AlertTriangle className="h-4 w-4" /> },
            ],
          },
        ]
      : []),

    ...(currentRole === 'guard'
      ? [
          {
            title: 'CONTROL DE GARITA',
            items: [
              { id: 'guard_dashboard', label: 'Panel Garita', icon: <LayoutDashboard className="h-4 w-4" /> },
              { id: 'guard_validator', label: 'Validar Código Visita', icon: <QrCode className="h-4 w-4" /> },
              { id: 'guard_directory', label: 'Directorio Telefónico', icon: <Users className="h-4 w-4" /> },
            ],
          },
        ]
      : []),

    {
      title: 'HERRAMIENTAS & EXPORTACIÓN',
      items: [
        { id: 'supabase_guide', label: 'Guía & README Supabase', icon: <Database className="h-4 w-4 text-emerald-400" /> },
        { id: 'expo_code_export', label: 'Código Expo React Native', icon: <Code2 className="h-4 w-4" /> },
      ],
    },
  ];

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    setIsMobileDrawerOpen(false);
  };

  const renderSidebar = () => (
    <aside className="w-68 bg-slate-950 text-white flex flex-col h-full border-r border-slate-800 select-none">
      {/* Header 64px with logo 9x9 */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800/80 bg-slate-950">
        <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-bold text-white block truncate tracking-tight">Conjuntos App</span>
          <span className="text-[10px] text-slate-400 block tracking-wide">Gestión Residencial</span>
        </div>
      </div>

      {/* Role Pill */}
      <div className="p-3">
        <div className={`rounded-xl px-3 py-2 border flex items-center justify-between ${roleInfo.pillClass}`}>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">{roleInfo.roleIcon}</span>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">{currentUser?.name || 'Usuario'}</span>
              <span className="text-[10px] opacity-80 block truncate">
                {currentRole === 'super_admin' ? 'Plataforma Global' : currentComplex?.name || 'Conjunto Residencial'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Complex Code banner (for Admin and Resident) */}
      {currentComplex && currentRole !== 'super_admin' && (
        <div className="px-3 pb-2">
          <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-800 flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Código Conjunto</span>
              <span className="font-mono font-bold text-emerald-400 text-[11px] truncate block">
                {currentComplex.code}
              </span>
            </div>
            <button
              onClick={handleCopyComplexCode}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-300 transition-colors cursor-pointer"
              title="Copiar código del conjunto"
            >
              {copiedCode ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Nav Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 mb-1.5">
              {section.title}
            </h3>
            {section.items.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-l-2 border-emerald-400 font-bold shadow-xs'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Quick Role Switcher Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          <span>Cambiar Rol Demo:</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => loginAsRole('super_admin')}
            title="Super Admin"
            className={`py-1 rounded-lg text-center text-xs transition-colors cursor-pointer ${
              currentRole === 'super_admin' ? 'bg-purple-900 text-purple-200 font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            👑
          </button>
          <button
            onClick={() => loginAsRole('admin')}
            title="Admin Conjunto"
            className={`py-1 rounded-lg text-center text-xs transition-colors cursor-pointer ${
              currentRole === 'admin' ? 'bg-emerald-900 text-emerald-200 font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            🏢
          </button>
          <button
            onClick={() => loginAsRole('resident')}
            title="Residente"
            className={`py-1 rounded-lg text-center text-xs transition-colors cursor-pointer ${
              currentRole === 'resident' ? 'bg-sky-900 text-sky-200 font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            🏠
          </button>
          <button
            onClick={() => loginAsRole('guard')}
            title="Guardia"
            className={`py-1 rounded-lg text-center text-xs transition-colors cursor-pointer ${
              currentRole === 'guard' ? 'bg-amber-900 text-amber-200 font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            👮
          </button>
        </div>

        <button
          onClick={logout}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors cursor-pointer border border-rose-500/20"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      {/* Android Device Simulator Container or Full Responsive Mode */}
      <div className={`flex-1 flex ${isDeviceFrameMode ? 'p-4 sm:p-6 justify-center items-center bg-slate-900 min-h-screen' : ''}`}>
        <div
          className={`flex-1 flex flex-col bg-slate-100/70 ${
            isDeviceFrameMode
              ? 'max-w-[430px] h-[880px] rounded-[44px] shadow-2xl border-[10px] border-slate-950 overflow-hidden relative'
              : 'w-full min-h-screen'
          }`}
        >
          {/* Android Status Bar in Device Mode */}
          {isDeviceFrameMode && (
            <div className="bg-slate-950 text-white text-[11px] px-6 pt-2.5 pb-1.5 flex items-center justify-between font-mono shrink-0 select-none z-30">
              <span>16:30</span>
              {/* Punch-hole camera */}
              <div className="h-3.5 w-3.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Main App Container */}
          <div className="flex-1 flex overflow-hidden relative">
            {/* Desktop Drawer Sidebar */}
            <div className="hidden lg:block shrink-0 h-full">{renderSidebar()}</div>

            {/* Mobile Drawer (Overlay) */}
            {isMobileDrawerOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex">
                <div
                  className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
                  onClick={() => setIsMobileDrawerOpen(false)}
                />
                <div className="relative z-10 animate-in slide-in-from-left duration-200">
                  {renderSidebar()}
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Top Header */}
              <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMobileDrawerOpen(true)}
                    className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
                    aria-label="Abrir menú"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm lg:hidden shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {currentRole === 'super_admin' ? 'Conjuntos App - Super Admin' : currentComplex?.name || 'Conjuntos App'}
                      </h2>
                      <div className="flex items-center gap-2">
                        <Badge variant={roleInfo.badgeVariant}>
                          {roleInfo.label}
                        </Badge>
                        {currentComplex && currentRole !== 'super_admin' && (
                          <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                            {currentComplex.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Supabase Status Indicator */}
                  <button
                    onClick={() => onNavigate('supabase_guide')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                      isSupabaseLive
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Ver Guía y Estado de Supabase"
                  >
                    <Database className={`h-3.5 w-3.5 ${isSupabaseLive ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`} />
                    <span className="hidden sm:inline font-medium">Supabase:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      isSupabaseLive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isSupabaseLive ? 'Online' : 'Demo'}
                    </span>
                  </button>

                  {/* Toggle Device Frame View */}
                  <button
                    onClick={() => setIsDeviceFrameMode(!isDeviceFrameMode)}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                    title={isDeviceFrameMode ? 'Modo Pantalla Completa' : 'Simulador Móvil Android'}
                  >
                    {isDeviceFrameMode ? (
                      <>
                        <Maximize2 className="h-3.5 w-3.5" />
                        <span>Expandir</span>
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Vista Celular</span>
                      </>
                    )}
                  </button>

                  {/* Notification Bell */}
                  <NotificationBell
                    notifications={notifications.filter((n) => !currentUser || n.user_id === currentUser.id)}
                    onMarkAllAsRead={markAllNotificationsAsRead}
                    onClearNotifications={clearNotifications}
                  />

                  {/* Desktop Logout Button */}
                  <button
                    onClick={logout}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Salir</span>
                  </button>
                </div>
              </header>

              {/* Main Content Body */}
              <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 lg:pb-8">
                {children}
              </main>

              {/* Mobile Bottom Navigation Bar (Tabs) */}
              <nav className="lg:hidden h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-20 shadow-lg">
                {currentRole === 'super_admin' && (
                  <>
                    <button
                      onClick={() => onNavigate('super_dashboard')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'super_dashboard' ? 'text-purple-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => onNavigate('super_complexes')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'super_complexes' ? 'text-purple-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                      <span>Conjuntos</span>
                    </button>
                    <button
                      onClick={() => onNavigate('super_subscriptions')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'super_subscriptions' ? 'text-purple-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <CreditCard className="h-5 w-5" />
                      <span>Planes</span>
                    </button>
                  </>
                )}

                {currentRole === 'admin' && (
                  <>
                    <button
                      onClick={() => onNavigate('admin_dashboard')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'admin_dashboard' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>Panel</span>
                    </button>
                    <button
                      onClick={() => onNavigate('admin_pending')}
                      className={`relative flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'admin_pending' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <UserCheck className="h-5 w-5" />
                      <span>Aprobar</span>
                      {pendingResidentsCount > 0 && (
                        <span className="absolute top-0 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </button>
                    <button
                      onClick={() => onNavigate('admin_visitors')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'admin_visitors' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <History className="h-5 w-5" />
                      <span>Visitas</span>
                    </button>
                    <button
                      onClick={() => onNavigate('admin_announcements')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'admin_announcements' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Megaphone className="h-5 w-5" />
                      <span>Avisos</span>
                    </button>
                  </>
                )}

                {currentRole === 'resident' && (
                  <>
                    <button
                      onClick={() => onNavigate('resident_dashboard')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'resident_dashboard' ? 'text-sky-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>Inicio</span>
                    </button>
                    <button
                      onClick={() => onNavigate('resident_visitors')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'resident_visitors' ? 'text-sky-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <QrCode className="h-5 w-5" />
                      <span>Visitas</span>
                    </button>
                    <button
                      onClick={() => onNavigate('resident_reservations')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'resident_reservations' ? 'text-sky-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <CalendarCheck className="h-5 w-5" />
                      <span>Reservas</span>
                    </button>
                    <button
                      onClick={() => onNavigate('resident_announcements')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'resident_announcements' ? 'text-sky-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Megaphone className="h-5 w-5" />
                      <span>Avisos</span>
                    </button>
                  </>
                )}

                {currentRole === 'guard' && (
                  <>
                    <button
                      onClick={() => onNavigate('guard_dashboard')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'guard_dashboard' ? 'text-amber-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <LayoutDashboard className="h-5 w-5" />
                      <span>Garita</span>
                    </button>
                    <button
                      onClick={() => onNavigate('guard_validator')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'guard_validator' ? 'text-amber-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <QrCode className="h-5 w-5" />
                      <span>Validar</span>
                    </button>
                    <button
                      onClick={() => onNavigate('guard_directory')}
                      className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                        currentView === 'guard_directory' ? 'text-amber-600 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Users className="h-5 w-5" />
                      <span>Directorio</span>
                    </button>
                  </>
                )}

                {/* Expo Code view tab */}
                <button
                  onClick={() => onNavigate('expo_code_export')}
                  className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-2 rounded-xl transition-colors cursor-pointer ${
                    currentView === 'expo_code_export' ? 'text-emerald-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  <Code2 className="h-5 w-5" />
                  <span>Expo Code</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Android Navigation Bar in Device Mode */}
          {isDeviceFrameMode && (
            <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-slate-700 rounded-full" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
