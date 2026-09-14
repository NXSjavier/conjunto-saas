import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabaseClient';
import { StatCard } from '../../ui/StatCard';
import { QuickActions } from '../../ui/QuickActions';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PLAN_LIMITS } from '../../../types.js';
import { Building2, Users, ShieldCheck, DollarSign, Plus, FileText, CheckCircle2, AlertCircle, Wifi, WifiOff, MonitorSmartphone, BarChart3, CalendarDays, ChevronRight, ArrowLeft } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { generateMonthlySubscriptionsReportPDF } from '../../../lib/pdf';

function presenceTimeAgo(dateString) {
  if (!dateString) return '';
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'recién conectado';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function roleBadge(role) {
  switch (role) {
    case 'super_admin':
      return <Badge variant="purple" size="sm">SUPER ADMIN</Badge>;
    case 'admin':
      return <Badge variant="sky" size="sm">ADMIN</Badge>;
    case 'guard':
      return <Badge variant="amber" size="sm">GUARDA</Badge>;
    default:
      return <Badge variant="emerald" size="sm">RESIDENTE</Badge>;
  }
}

const ROLE_LABELS = { super_admin: 'Super Admins', admin: 'Administradores', guard: 'Guardas', resident: 'Residentes' };

export const SuperAdminDashboard = ({ onNavigate }) => {
  const { complexes, users, audits, onlineUsers, dailyUsage } = useData();
  const { currentUser } = useAuth();
  const [presenceComplex, setPresenceComplex] = useState('all');
  const [appErrors, setAppErrors] = useState([]);
  const [errorsLoading, setErrorsLoading] = useState(false);

  const loadAppErrors = async () => {
    setErrorsLoading(true);
    try {
      const { data } = await supabase
        .from('app_errors')
        .select('id, message, url, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      setAppErrors(data || []);
    } catch {}
    setErrorsLoading(false);
  };

  const clearAppErrors = async () => {
    if (!confirm('¿Eliminar todos los errores registrados?')) return;
    try {
      const ids = appErrors.map((e) => e.id);
      if (ids.length === 0) return;
      await supabase.from('app_errors').delete().in('id', ids);
      setAppErrors([]);
    } catch {}
  };

  React.useEffect(() => {
    loadAppErrors();
  }, []);

  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const activeComplexes = complexes.filter((c) => c.status === 'active').length;
  const COP_PER_USD = 4000;
  const planRevenueUsd = (plan) => (PLAN_LIMITS[plan]?.price_usd) || 0;
  const estimatedRevenueUsd = complexes.reduce((acc, c) => acc + planRevenueUsd(c.plan), 0);
  const estimatedRevenue = estimatedRevenueUsd * COP_PER_USD;

  const NONE_KEY = '__none__';
  const cxKey = (id) => id || NONE_KEY;
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const dayShort = (ymd) => {
    try {
      const [y, m, dd] = ymd.split('-').map(Number);
      const wd = new Intl.DateTimeFormat('es', { weekday: 'short' }).format(new Date(y, m - 1, dd)).replace('.', '');
      return `${wd} ${dd}`;
    } catch { return ymd; }
  };

  const onlineIds = new Set(onlineUsers.map((u) => u.id));
  const activeUsers = users.filter((u) => u.status === 'active');
  const offlineUsers = activeUsers.filter((u) => !onlineIds.has(u.id));
  const totalDevices = onlineUsers.reduce((acc, u) => acc + (u.devices || 1), 0);
  const usedTodayIds = new Set((dailyUsage || []).filter((r) => r.day === todayStr).map((r) => r.auth_user_id));

  // Estadísticas por conjunto (conectados / desconectados / uso hoy)
  const complexStats = complexes.map((c) => {
    const act = activeUsers.filter((u) => u.complex_id === c.id);
    const on = onlineUsers.filter((u) => cxKey(u.complex_id) === c.id);
    const onIds = new Set(on.map((o) => o.id));
    const used = new Set(
      (dailyUsage || []).filter((r) => r.day === todayStr && cxKey(r.complex_id) === c.id).map((r) => r.auth_user_id)
    );
    return {
      id: c.id, name: c.name, code: c.code, plan: c.plan,
      total: act.length, users: act, online: on,
      offlineCount: Math.max(0, act.length - onIds.size),
      usedToday: used.size,
    };
  });
  const noneActive = activeUsers.filter((u) => !u.complex_id);
  const noneOnline = onlineUsers.filter((u) => !u.complex_id);
  const noneUsed = new Set((dailyUsage || []).filter((r) => r.day === todayStr && !r.complex_id).map((r) => r.auth_user_id));
  if (noneActive.length > 0 || noneOnline.length > 0 || noneUsed.size > 0) {
    const noneIds = new Set(noneOnline.map((o) => o.id));
    complexStats.push({
      id: NONE_KEY, name: 'Sin conjunto', code: '—', plan: null,
      total: noneActive.length, users: noneActive, online: noneOnline,
      offlineCount: Math.max(0, noneActive.length - noneIds.size),
      usedToday: noneUsed.size,
    });
  }

  // Conteo de usuarios distintos por día (global o por conjunto)
  const weekCounts = (complexId) => last7Days.map((day) => {
    const rows = (dailyUsage || []).filter((r) => r.day === day && (complexId === 'all' || cxKey(r.complex_id) === complexId));
    return { day, count: new Set(rows.map((r) => r.auth_user_id)).size };
  });
  const weekMax = (arr) => Math.max(1, ...arr.map((w) => w.count));
  const weekAll = weekCounts('all');

  const selStat = presenceComplex === 'all' ? null : complexStats.find((s) => s.id === presenceComplex);
  const selOffline = selStat ? selStat.users.filter((u) => !onlineIds.has(u.id)).slice(0, 12) : [];
  const selOfflineTotal = selStat ? Math.max(0, selStat.total - new Set(selStat.online.map((o) => o.id)).size) : 0;
  const selOnlineSorted = selStat ? [...selStat.online].sort((a, b) => (b.online_at || '').localeCompare(a.online_at || '')) : [];
  const selWeek = selStat ? weekCounts(selStat.id) : [];

  const quickActions = [
    {
      id: 'qa-complex',
      title: 'Crear Conjunto Residencial',
      description: 'Registra un nuevo condominio o edificio en el SaaS',
      icon: <Building2 className="w-5 h-5" />,
      onClick: () => onNavigate('super_complexes'),
      variant: 'emerald',
    },
    {
      id: 'qa-admin',
      title: 'Crear Cuenta de Administrador',
      description: 'Asigna un usuario administrador a un conjunto',
      icon: <ShieldCheck className="w-5 h-5" />,
      onClick: () => onNavigate('super_admins'),
      variant: 'purple',
    },
    {
      id: 'qa-subs',
      title: 'Gestionar Suscripciones',
      description: 'Revisa pagos, renovaciones y cambios de plan',
      icon: <DollarSign className="w-5 h-5" />,
      onClick: () => onNavigate('super_subscriptions'),
      variant: 'sky',
    },
    {
      id: 'qa-users',
      title: 'Auditoría y Purga de Cuentas',
      description: 'Eliminación segura en cascada con certificado PDF',
      icon: <Users className="w-5 h-5" />,
      onClick: () => onNavigate('super_users'),
      variant: 'rose',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider">
              Consola SaaS
            </span>
            <span className="text-xs text-slate-400">Plataforma Global</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">Panel Principal de Super Administrador</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoreo en tiempo real de todos los conjuntos residenciales, planes contratados y auditorías.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              icon={<FileText className="w-4 h-4" />}
              onClick={() => generateMonthlySubscriptionsReportPDF(complexes, currentUser)}
            >
              Exportar Informe PDF
            </Button>
          )}
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => onNavigate('super_complexes')}>
            Nuevo Conjunto
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Conjuntos Activos"
          value={`${activeComplexes} / ${complexes.length}`}
          icon={<Building2 className="w-5 h-5" />}
          subtitle="Condominios en línea"
          variant="emerald"
          onClick={() => onNavigate('super_complexes')}
        />
        <StatCard
          title="Administradores"
          value={totalAdmins}
          icon={<ShieldCheck className="w-5 h-5" />}
          subtitle="Cuentas asignadas"
          variant="purple"
          onClick={() => onNavigate('super_admins')}
        />
        <StatCard
          title="Ingreso Estimado"
          value={`$${(estimatedRevenue / 1000).toLocaleString('es-CO')}k COP`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle={`$${estimatedRevenueUsd.toLocaleString('en-US')} USD mensuales`}
          variant="sky"
          onClick={() => onNavigate('super_subscriptions')}
        />
        <StatCard
          title="Usuarios Totales"
          value={users.length}
          icon={<Users className="w-5 h-5" />}
          subtitle={`${onlineUsers.length} en línea · ${offlineUsers.length} desconectados`}
          variant="amber"
          onClick={() => onNavigate('super_users')}
        />
      </div>

      {/* ✅ Presencia en Tiempo Real (solo visible para super_admin) */}
      <Card
        title="Presencia en Tiempo Real"
        subtitle="Usuarios conectados y desconectados en toda la plataforma"
        action={
          <span className="flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            EN VIVO
          </span>
        }
      >
        {/* Resumen */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 text-emerald-300">
              <Wifi className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Conectados</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">{onlineUsers.length}</div>
            <div className="text-[11px] font-medium text-emerald-300/80 mt-0.5">usuarios en línea</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-300">
              <WifiOff className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Desconectados</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">{offlineUsers.length}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-0.5">usuarios registrados activos</div>
          </div>
          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
            <div className="flex items-center gap-2 text-sky-300">
              <MonitorSmartphone className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Dispositivos</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">{totalDevices}</div>
            <div className="text-[11px] font-medium text-sky-300/80 mt-0.5">sesiones activas</div>
          </div>
          <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-2 text-violet-300">
              <BarChart3 className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Uso hoy</span>
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">{usedTodayIds.size}<span className="text-base text-slate-400 font-bold">/{activeUsers.length}</span></div>
            <div className="text-[11px] font-medium text-violet-300/80 mt-0.5">usuarios activos hoy</div>
          </div>
        </div>

        {/* Filtro por conjunto */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 no-scrollbar">
          <button
            onClick={() => setPresenceComplex('all')}
            className={`flex-shrink-0 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
              presenceComplex === 'all'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            Todos
          </button>
          {complexStats.map((s) => (
            <button
              key={s.id}
              onClick={() => setPresenceComplex(s.id)}
              className={`flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[10px] sm:text-xs font-bold transition-all cursor-pointer ${
                presenceComplex === s.id
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {s.name}
              <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${presenceComplex === s.id ? 'bg-white/20 text-white' : 'bg-emerald-500/15 text-emerald-300'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {s.online.length}
              </span>
            </button>
          ))}
        </div>

        {presenceComplex === 'all' ? (
          <>
            {/* Uso diario global · últimos 7 días */}
            <div className="mb-5 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-4 h-4 text-violet-300" />
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">Uso diario · últimos 7 días</h4>
              </div>
              <div className="flex items-end gap-1.5">
                {weekAll.map((w) => (
                  <div key={w.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-200">{w.count}</span>
                    <div className="w-full rounded-md bg-slate-800 flex items-end overflow-hidden" style={{ height: '64px' }}>
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-violet-600 to-violet-400"
                        style={{ height: `${Math.max(5, (w.count / weekMax(weekAll)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 capitalize truncate">{dayShort(w.day)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mini-cards por conjunto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {complexStats.map((s) => {
                const pct = s.total > 0 ? Math.round((s.usedToday / s.total) * 100) : 0;
                return (
                  <button
                    key={s.id}
                    onClick={() => setPresenceComplex(s.id)}
                    className="text-left p-4 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-600 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h5 className="text-sm font-bold text-white truncate">{s.name}</h5>
                        <span className="text-[10px] font-mono text-slate-500">{s.code}</span>
                      </div>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {s.online.length} en línea
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                        <span>Uso hoy</span>
                        <span className="text-white">{s.usedToday}/{s.total} · {pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2.5 text-[11px]">
                      <span className="text-slate-500">{s.offlineCount} desconectados</span>
                      <span className="flex items-center gap-1 text-slate-400 font-bold">Ver detalle <ChevronRight className="w-3.5 h-3.5" /></span>
                    </div>
                  </button>
                );
              })}
              {complexStats.length === 0 && (
                <p className="text-xs text-slate-500 col-span-full text-center py-6">Sin conjuntos registrados</p>
              )}
            </div>
          </>
        ) : selStat ? (
          <div>
            <button
              onClick={() => setPresenceComplex('all')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a todos los conjuntos
            </button>

            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h4 className="text-base font-extrabold text-white truncate">{selStat.name}</h4>
                <span className="text-[11px] font-mono text-slate-500">{selStat.code}</span>
              </div>
              {selStat.plan && (
                <Badge variant={selStat.plan === 'enterprise' ? 'purple' : selStat.plan === 'pro' ? 'emerald' : 'slate'} size="sm">
                  {selStat.plan.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Uso hoy del conjunto */}
            <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/15 mb-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1.5">
                <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-violet-300" /> Uso hoy</span>
                <span className="text-white">{selStat.usedToday}/{selStat.total} · {selStat.total > 0 ? Math.round((selStat.usedToday / selStat.total) * 100) : 0}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                  style={{ width: `${selStat.total > 0 ? Math.round((selStat.usedToday / selStat.total) * 100) : 0}%` }}
                />
              </div>
              <div className="flex items-end gap-1.5">
                {selWeek.map((w) => (
                  <div key={w.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-200">{w.count}</span>
                    <div className="w-full rounded-md bg-slate-800 flex items-end overflow-hidden" style={{ height: '48px' }}>
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-violet-600 to-violet-400"
                        style={{ height: `${Math.max(5, (w.count / weekMax(selWeek)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 capitalize truncate">{dayShort(w.day)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conectados del conjunto */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">Conectados ahora</h4>
                  <span className="text-[11px] font-bold text-white bg-emerald-500 rounded-full px-2 py-0.5">{selStat.online.length}</span>
                </div>
                {selOnlineSorted.length === 0 ? (
                  <div className="py-8 text-center">
                    <WifiOff className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">Nadie de este conjunto conectado</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {selOnlineSorted.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-300">
                            {(u.name || 'U').substring(0, 2).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{u.name || 'Usuario'}</span>
                            {roleBadge(u.role)}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="whitespace-nowrap">{presenceTimeAgo(u.online_at)}</span>
                            {(u.devices || 1) > 1 && (
                              <>
                                <span className="text-slate-600">·</span>
                                <span className="whitespace-nowrap text-sky-400 font-semibold">{u.devices} dispositivos</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Desconectados del conjunto */}
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Desconectados</h4>
                  <span className="text-[11px] font-bold text-slate-300 bg-slate-800 rounded-full px-2 py-0.5">{selOfflineTotal}</span>
                </div>
                {selOfflineTotal === 0 ? (
                  <div className="py-6 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-400">Todos en línea</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                    {selOffline.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/40 border border-slate-800/60">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[11px] text-slate-400 flex-shrink-0">
                          {(u.name || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-medium text-slate-300 truncate">{u.name}</span>
                          <span className="block text-[11px] text-slate-500 truncate">{u.role === 'resident' ? (u.apartment || 'Sin unidad') : ROLE_LABELS[u.role] || u.role}</span>
                        </div>
                        {roleBadge(u.role)}
                      </div>
                    ))}
                    {selOfflineTotal > selOffline.length && (
                      <p className="text-center text-[11px] text-slate-500 py-2">
                        +{selOfflineTotal - selOffline.length} desconectados más
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {/* Quick Actions */}
      <QuickActions items={quickActions} />

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complexes Overview */}
        <Card
          title="Conjuntos Residenciales Recientes"
          subtitle="Estado y planes de suscripción"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('super_complexes')}>
              Ver todos
            </Button>
          }
        >
          <div className="divide-y divide-slate-800/60">
            {complexes.slice(0, 5).map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-slate-200 truncate">{c.name}</h5>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{c.address || 'Sin dirección'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={c.plan === 'enterprise' ? 'purple' : c.plan === 'pro' ? 'emerald' : 'slate'} size="sm">
                    {c.plan.toUpperCase()}
                  </Badge>
                  <Badge variant={c.status === 'active' ? 'emerald' : 'rose'} size="sm" dot>
                    {c.status === 'active' ? 'Activo' : 'Bloqueado'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Live Security Audit Log */}
        <Card
          title="Auditoría de Seguridad en Vivo"
          subtitle="Eventos y cambios críticos del sistema"
          action={
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              WebSocket Sync
            </span>
          }
        >
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {audits.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">Sin eventos de auditoría registrados</div>
            ) : (
              audits.slice(0, 6).map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-200">{a.action.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-slate-400 mt-1">
                    Operador: <span className="text-slate-300 font-medium">{a.user_name || 'Sistema'}</span> ({a.entity})
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Errores de la App (monitoreo) */}
      <Card
        title="Errores de la App"
        subtitle="Fallos reportados por los dispositivos (últimos 10)"
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadAppErrors} disabled={errorsLoading}>
              {errorsLoading ? 'Cargando...' : 'Actualizar'}
            </Button>
            {appErrors.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAppErrors}>
                Limpiar
              </Button>
            )}
          </div>
        }
      >
        {appErrors.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            Sin errores registrados. La app está estable.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {appErrors.map((e) => (
              <div key={e.id} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-rose-200 truncate">{e.message}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{formatDate(e.created_at)}</span>
                </div>
                <p className="text-slate-500 mt-0.5 truncate">
                  {e.role ? `${e.role} · ` : ''}{(e.url || '').replace(/^https?:\/\/[^/]+/, '') || '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
