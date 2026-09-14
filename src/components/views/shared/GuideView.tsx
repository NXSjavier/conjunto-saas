import React, { useState } from 'react';
import {
  BookOpen, Download, Shield, Users, Home, QrCode, Megaphone,
  AlertTriangle, CalendarCheck, CheckCircle2, ClipboardList,
  UserCheck, Building2, Lock, Bell, Key, ArrowRight, Lightbulb,
  LayoutDashboard, Sparkles, ChevronRight, LogIn, Smartphone,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { generateGuidePDF } from '../../../lib/guidePdf';

interface Step {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
  color: string;
}

interface RoleGuide {
  id: string;
  label: string;
  tagline: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  softBg: string;
  softText: string;
  softBorder: string;
  sections: { title: string; subtitle: string; steps: Step[] }[];
}

const GUIDES: RoleGuide[] = [
  {
    id: 'admin',
    label: 'Administrador',
    tagline: 'Gestiona tu conjunto de principio a fin',
    icon: <Shield className="w-5 h-5" />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    softBg: 'bg-emerald-500/10',
    softText: 'text-emerald-300',
    softBorder: 'border-emerald-500/25',
    sections: [
      {
        title: 'Primeros pasos',
        subtitle: 'Lo básico para arrancar',
        steps: [
          { title: 'Mira tu Dashboard', description: 'Residentes activos, ocupación, visitas e incidencias de un vistazo.', icon: <LayoutDashboard className="w-5 h-5" />, color: 'emerald', tip: 'Las tarjetas son botones: tócalas para ir a cada sección.' },
          { title: 'Aprueba residentes', description: 'Revisa la foto y los datos de cada solicitud y aprueba con un toque.', icon: <UserCheck className="w-5 h-5" />, color: 'emerald', tip: 'Comparte el código del conjunto solo con residentes reales.' },
        ],
      },
      {
        title: 'Comunicar y resolver',
        subtitle: 'El día a día del conjunto',
        steps: [
          { title: 'Publica comunicados', description: 'Avisos oficiales que llegan al instante a todos por push.', icon: <Megaphone className="w-5 h-5" />, color: 'emerald' },
          { title: 'Atiende incidencias', description: 'Cambia el estado a medida que avanzas: abierta → en proceso → cerrada.', icon: <AlertTriangle className="w-5 h-5" />, color: 'emerald', tip: 'El residente recibe aviso automático con cada cambio.' },
          { title: 'Aprueba reservas', description: 'Revisa fecha y horario de cada solicitud de zona común y responde.', icon: <CalendarCheck className="w-5 h-5" />, color: 'emerald' },
        ],
      },
      {
        title: 'Seguridad',
        subtitle: 'Control total',
        steps: [
          { title: 'Revisa la bitácora', description: 'Historial de entradas y salidas con código, hora y guarda que validó.', icon: <ClipboardList className="w-5 h-5" />, color: 'emerald' },
          { title: 'Crea guardas', description: 'Registra al personal de portería y comparte su contraseña temporal.', icon: <Key className="w-5 h-5" />, color: 'emerald', tip: 'El guarda debe cambiarla en su primer acceso.' },
        ],
      },
    ],
  },
  {
    id: 'resident',
    label: 'Residente',
    tagline: 'Todo tu apartamento en el bolsillo',
    icon: <Home className="w-5 h-5" />,
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    softBg: 'bg-sky-500/10',
    softText: 'text-sky-300',
    softBorder: 'border-sky-500/25',
    sections: [
      {
        title: 'Empezar',
        subtitle: 'Tu cuenta en 3 pasos',
        steps: [
          { title: 'Regístrate', description: 'Nombre, email, contraseña, foto de rostro y el código de tu conjunto.', icon: <LogIn className="w-5 h-5" />, color: 'sky', tip: 'El código te lo entrega tu administrador.' },
          { title: 'Espera la aprobación', description: 'El admin verifica tus datos. Te avisaremos cuando puedas entrar.', icon: <Lock className="w-5 h-5" />, color: 'sky' },
          { title: 'Activa notificaciones', description: 'Acepta el permiso para recibir avisos aunque la app esté cerrada.', icon: <Bell className="w-5 h-5" />, color: 'sky', tip: 'Sin esto no te llegarán visitas ni comunicados.' },
        ],
      },
      {
        title: 'Tu día a día',
        subtitle: 'Lo que más usarás',
        steps: [
          { title: 'Genera pases de visita', description: 'Crea un código único por visitante y compártelo por WhatsApp.', icon: <QrCode className="w-5 h-5" />, color: 'sky', tip: 'Te avisamos cuando tu visita ingresa y cuando sale.' },
          { title: 'Reserva zonas comunes', description: 'Elige área, fecha y hora. Revisa que no se cruce con otra reserva.', icon: <CalendarCheck className="w-5 h-5" />, color: 'sky' },
          { title: 'Reporta incidencias', description: 'Describe el problema y adjunta foto si puedes. El admin lo atiende.', icon: <AlertTriangle className="w-5 h-5" />, color: 'sky' },
          { title: 'Lee los comunicados', description: 'Avisos oficiales del conjunto, con comentarios en vivo.', icon: <Megaphone className="w-5 h-5" />, color: 'sky' },
        ],
      },
    ],
  },
  {
    id: 'guard',
    label: 'Guarda de portería',
    tagline: 'Control de acceso rápido y seguro',
    icon: <Shield className="w-5 h-5" />,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    softBg: 'bg-amber-500/10',
    softText: 'text-amber-300',
    softBorder: 'border-amber-500/25',
    sections: [
      {
        title: 'Empezar',
        subtitle: 'Tu primer turno',
        steps: [
          { title: 'Ingresa con tu contraseña temporal', description: 'El admin te entrega email y contraseña para tu primer acceso.', icon: <Key className="w-5 h-5" />, color: 'amber', tip: 'Cámbiala apenas entres, desde tu panel.' },
        ],
      },
      {
        title: 'Control de acceso',
        subtitle: 'Cada visita en 3 toques',
        steps: [
          { title: 'Valida el código', description: 'Pide el código al visitante e ingrésalo en el verificador.', icon: <QrCode className="w-5 h-5" />, color: 'amber', tip: 'Si es inválido, la app te lo indica al instante.' },
          { title: 'Registra la entrada', description: 'Confirma el ingreso. El residente recibe aviso automático.', icon: <CheckCircle2 className="w-5 h-5" />, color: 'amber' },
          { title: 'Registra la salida', description: 'Cuando se va, marca la salida desde "Dentro del conjunto".', icon: <ArrowRight className="w-5 h-5" />, color: 'amber' },
        ],
      },
      {
        title: 'Si no hay código',
        subtitle: 'Plan B',
        steps: [
          { title: 'Usa el directorio', description: 'Busca al residente por nombre o apartamento y confirma la visita por teléfono.', icon: <Users className="w-5 h-5" />, color: 'amber' },
        ],
      },
    ],
  },
];

const ESSENTIAL_TIPS = [
  { icon: <Bell className="w-5 h-5" />, title: 'Notificaciones activadas', text: 'Sin permiso de notificaciones no llegan visitas ni avisos. Actívalas desde el banner verde.', color: 'emerald' as const },
  { icon: <Smartphone className="w-5 h-5" />, title: 'Instala la app', text: 'Desde Chrome: menú ⋮ → Instalar app. Funciona a pantalla completa, como nativa.', color: 'sky' as const },
  { icon: <Lock className="w-5 h-5" />, title: 'Cuida tu cuenta', text: 'Nunca compartas tu contraseña. Cierra sesión si usas un equipo prestado.', color: 'amber' as const },
];

const tipStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300',
  sky: 'bg-sky-500/10 border-sky-500/25 text-sky-300',
  amber: 'bg-amber-500/10 border-amber-500/25 text-amber-300',
};

export const GuideView: React.FC = () => {
  const { currentUser } = useAuth();
  const defaultRole = ['admin', 'resident', 'guard'].includes(currentUser?.role || '') ? currentUser!.role : 'resident';
  const [activeRole, setActiveRole] = useState<string>(defaultRole);
  const [downloading, setDownloading] = useState(false);
  const guide = GUIDES.find((g) => g.id === activeRole) || GUIDES[1];
  const totalSteps = guide.sections.reduce((a, s) => a + s.steps.length, 0);
  let stepCounter = 0;

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await generateGuidePDF(guide);
    } catch (e) {
      console.error('Error generando PDF:', e);
      alert('No se pudo generar el PDF. Intenta de nuevo o revisa tu conexión.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6 animate-enter">
      {/* ═══ PORTADA ═══ */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${guide.gradient} p-6 sm:p-10 shadow-2xl`}>
        {/* Decoración */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-black/15 blur-2xl" />
        <div className="absolute top-6 right-8 hidden sm:flex w-24 h-24 rounded-3xl bg-white/15 backdrop-blur items-center justify-center rotate-12">
          <Building2 className="w-12 h-12 text-white/90" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">Residex</p>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">Guía de uso</h1>
            </div>
          </div>
          <p className="text-white/90 text-sm sm:text-base font-medium mt-3 max-w-md">
            Solo lo esencial para dominar la app desde hoy. Elige tu rol:
          </p>

          {/* Tabs de rol */}
          <div className="flex flex-wrap gap-2 mt-5">
            {GUIDES.map((g) => {
              const active = g.id === activeRole;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveRole(g.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-xl scale-[1.02]'
                      : 'bg-white/15 text-white hover:bg-white/25 backdrop-blur'
                  }`}
                >
                  {g.icon}
                  {g.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/90 bg-black/20 rounded-full px-3 py-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {guide.sections.length} capítulos · {totalSteps} pasos · 5 min
            </span>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-900 bg-white rounded-full px-3 py-1.5 hover:bg-white/90 transition-colors cursor-pointer shadow disabled:opacity-70"
            >
              <Download className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
              {downloading ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Tagline del rol */}
      <div className="flex items-center gap-2 -mb-2">
        <span className={`w-8 h-8 rounded-xl ${guide.softBg} ${guide.softBorder} border flex items-center justify-center ${guide.softText}`}>
          {guide.icon}
        </span>
        <p className="text-sm font-bold text-slate-200">{guide.tagline}</p>
      </div>

      {/* ═══ CAPÍTULOS ═══ */}
      {guide.sections.map((section, si) => (
        <section key={si} className="rounded-3xl bg-slate-900 border border-slate-700/60 overflow-hidden shadow-card">
          {/* Encabezado del capítulo */}
          <div className="flex items-center gap-4 px-5 sm:px-6 pt-5">
            <span className={`text-4xl sm:text-5xl font-extrabold bg-gradient-to-br ${guide.gradient} bg-clip-text text-transparent leading-none tabular-nums`}>
              {String(si + 1).padStart(2, '0')}
            </span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate">{section.title}</h2>
              <p className="text-xs text-slate-400 font-medium">{section.subtitle} · {section.steps.length} pasos</p>
            </div>
          </div>

          {/* Pasos */}
          <div className="p-4 sm:p-5 space-y-3">
            {section.steps.map((step) => {
              stepCounter += 1;
              return (
                <div
                  key={stepCounter}
                  className="flex gap-3 sm:gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-600 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <span className={`w-10 h-10 rounded-2xl ${guide.softBg} ${guide.softBorder} border flex items-center justify-center ${guide.softText}`}>
                      {step.icon}
                    </span>
                    <span className="text-[10px] font-extrabold text-slate-500 tabular-nums">PASO {stepCounter}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-[15px] font-bold text-white">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">{step.description}</p>
                    {step.tip && (
                      <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                        <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                        <p className="text-[11px] sm:text-xs font-medium text-amber-200 leading-relaxed">{step.tip}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ═══ LO ESENCIAL ═══ */}
      <div className="rounded-3xl overflow-hidden border border-slate-700/60">
        <div className={`bg-gradient-to-r ${guide.gradient} px-5 sm:px-6 py-4`}>
          <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            No olvides lo esencial
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 bg-slate-900">
          {ESSENTIAL_TIPS.map((t) => (
            <div key={t.title} className={`rounded-2xl border p-4 ${tipStyles[t.color]}`}>
              <div className="flex items-center gap-2">
                {t.icon}
                <p className="text-xs sm:text-sm font-extrabold text-white">{t.title}</p>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Siguiente rol */}
      <button
        onClick={() => {
          const idx = GUIDES.findIndex((g) => g.id === activeRole);
          setActiveRole(GUIDES[(idx + 1) % GUIDES.length].id);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-900 border border-slate-700/60 hover:border-slate-500 transition-colors cursor-pointer group"
      >
        <span className="text-xs sm:text-sm font-bold text-slate-300">
          Ver guía de: <span className="text-white">{GUIDES[(GUIDES.findIndex((g) => g.id === activeRole) + 1) % GUIDES.length].label}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
      </button>
    </div>
  );
};
