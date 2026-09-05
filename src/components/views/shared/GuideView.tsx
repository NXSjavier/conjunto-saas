import React, { useState } from 'react';
import {
  BookOpen, Download, ChevronDown, ChevronRight, Shield, Users, Home,
  QrCode, Megaphone, AlertTriangle, CalendarCheck, CheckCircle2, Eye,
  ClipboardList, UserCheck, Building, Lock, Bell, FileText, Camera,
  Settings, BarChart3, Compass, Key, ArrowRight, Star, Zap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
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
  icon: React.ReactNode;
  color: string;
  gradient: string;
  sections: { title: string; steps: Step[] }[];
}

const GUIDES: RoleGuide[] = [
  {
    id: 'admin',
    label: 'Administrador',
    icon: <Shield className="w-5 h-5" />,
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    sections: [
      {
        title: 'Panel Principal',
        steps: [
          { title: 'Dashboard', description: 'Visualiza métricas en tiempo real: residentes activos, visitas del día, incidencias pendientes y reservas.', icon: <BarChart3 className="w-5 h-5" />, color: 'emerald', tip: 'Los datos se actualizan automáticamente vía Supabase Realtime.' },
          { title: 'Aprobar Residentes', description: 'Revisa solicitudes de registro. Verifica la foto, nombre y departamento. Aprueba o rechaza con un toque.', icon: <UserCheck className="w-5 h-5" />, color: 'emerald', tip: 'El residente recibe una notificación al ser aprobado.' },
          { title: 'Torres y Bloques', description: 'Organiza tu conjunto en torres/bloques. Crea, edita o elimina estructuras.', icon: <Building className="w-5 h-5" />, color: 'emerald' },
        ],
      },
      {
        title: 'Gestión de Residentes',
        steps: [
          { title: 'Directorio', description: 'Lista completa de residentes con foto, departamento, teléfono y estado. Busca por nombre.', icon: <Users className="w-5 h-5" />, color: 'emerald' },
          { title: 'Departamentos', description: 'Administra apartamentos: asigna residentes, cambia estado (ocupado/disponible/mantenimiento).', icon: <Home className="w-5 h-5" />, color: 'emerald' },
          { title: 'Crear Guardias', description: 'Registra personal de portería. Se genera contraseña temporal que debes compartir con el guarda.', icon: <Key className="w-5 h-5" />, color: 'emerald', tip: 'El guarda usa esa contraseña para su primer login.' },
        ],
      },
      {
        title: 'Comunicaciones',
        steps: [
          { title: 'Comunicados', description: 'Envía avisos a todos los residentes del conjunto. Título, contenido y publicación instantánea.', icon: <Megaphone className="w-5 h-5" />, color: 'emerald', tip: 'Los residentes reciben notificación push cuando publicas.' },
          { title: 'Incidencias', description: 'Monitorea reportes de residentes: amenidades dañadas, fugas, ruido. Actualiza estado y prioridad.', icon: <AlertTriangle className="w-5 h-5" />, color: 'emerald' },
          { title: 'Reservas', description: 'Aprueba o rechaza solicitudes de reserva de áreas comunes (salón, piscina, terraza).', icon: <CalendarCheck className="w-5 h-5" />, color: 'emerald' },
        ],
      },
      {
        title: 'Seguridad y Auditoría',
        steps: [
          { title: 'Bitácora Visitantes', description: 'Historial completo de entradas/salidas con código QR, hora y guarda que validó.', icon: <ClipboardList className="w-5 h-5" />, color: 'emerald' },
          { title: 'Auditoría', description: 'Registro de todas las acciones realizadas en el sistema: quién, qué y cuándo.', icon: <Compass className="w-5 h-5" />, color: 'emerald', tip: 'Útil para resolver disputas o investigar incidentes.' },
          { title: 'Reportes', description: 'Genera reportes de actividad: visitas por mes, incidencias por tipo, uso de áreas.', icon: <FileText className="w-5 h-5" />, color: 'emerald' },
        ],
      },
    ],
  },
  {
    id: 'resident',
    label: 'Residente',
    icon: <Home className="w-5 h-5" />,
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    sections: [
      {
        title: 'Registro y Acceso',
        steps: [
          { title: 'Registrarse', description: 'Ingresa tu datos: nombre, email, contraseña. Selecciona tu conjunto con el código que te dio el admin.', icon: <Zap className="w-5 h-5" />, color: 'sky', tip: 'Toma una foto de rostro para verificación de seguridad.' },
          { title: 'Esperar Aprobación', description: 'El administrador revisa tu solicitud. Recibirás una notificación cuando sea aprobada.', icon: <Lock className="w-5 h-5" />, color: 'sky' },
          { title: 'Iniciar Sesión', description: 'Usa tu email y contraseña. Si olvidaste tu contraseña, usa la opción de recuperación.', icon: <Key className="w-5 h-5" />, color: 'sky' },
        ],
      },
      {
        title: 'Gestión de Visitas',
        steps: [
          { title: 'Generar Código de Visita', description: 'Ingresa datos del visitante: nombre, cédula, motivo. Se genera un código QR único.', icon: <QrCode className="w-5 h-5" />, color: 'sky', tip: 'Comparte el código con tu visitante por WhatsApp.' },
          { title: 'Historial de Visitas', description: 'Revisa todas tus visitas: entradas, salidas, pendientes. Cancela visitas que ya no aplican.', icon: <Eye className="w-5 h-5" />, color: 'sky' },
          { title: 'En la Garita', description: 'El visitante muestra el código al guarda. El guarda lo escanea y registra entrada/salida.', icon: <Shield className="w-5 h-5" />, color: 'sky' },
        ],
      },
      {
        title: 'Servicios del Conjunto',
        steps: [
          { title: 'Reservar Áreas', description: 'Selecciona el área (salón, piscina, terraza), fecha y hora. Espera aprobación del admin.', icon: <CalendarCheck className="w-5 h-5" />, color: 'sky', tip: 'Puedes ver disponibilidad en tiempo real.' },
          { title: 'Reportar Incidencia', description: 'Describe el problema, adjunta foto si es posible. El admin recibe notificación.', icon: <AlertTriangle className="w-5 h-5" />, color: 'sky' },
          { title: 'Comunicados', description: 'Lee avisos del administrador: mantenimientos, eventos, cambios de horario.', icon: <Megaphone className="w-5 h-5" />, color: 'sky' },
        ],
      },
    ],
  },
  {
    id: 'guard',
    label: 'Guardia de Garita',
    icon: <Shield className="w-5 h-5" />,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    sections: [
      {
        title: 'Primer Acceso',
        steps: [
          { title: 'Credenciales', description: 'El admin te proporciona email y contraseña temporal. Úsalos para tu primer ingreso.', icon: <Key className="w-5 h-5" />, color: 'amber', tip: 'Cambia tu contraseña después del primer login.' },
          { title: 'Panel de Garita', description: 'Tu pantalla principal muestra visitas pendientes del día y estadísticas rápidas.', icon: <LayoutDashboard className="w-5 h-5" />, color: 'amber' },
        ],
      },
      {
        title: 'Control de Acceso',
        steps: [
          { title: 'Validar Código', description: 'Pide al visitante su código QR. Escanéalo o ingrésalo manualmente para validar.', icon: <QrCode className="w-5 h-5" />, color: 'amber', tip: 'Si el código es inválido, la app te lo indica inmediatamente.' },
          { title: 'Registrar Entrada', description: 'Al validar, registra la hora de entrada. El residente recibe notificación.', icon: <CheckCircle2 className="w-5 h-5" />, color: 'amber' },
          { title: 'Registrar Salida', description: 'Cuando el visitante se va, registra la salida. Se actualiza el historial.', icon: <ArrowRight className="w-5 h-5" />, color: 'amber' },
        ],
      },
      {
        title: 'Directorio',
        steps: [
          { title: 'Buscar Residente', description: 'Accede al directorio telefónico. Busca por nombre o departamento para contactar al residente.', icon: <Users className="w-5 h-5" />, color: 'amber', tip: 'Útil cuando un visitante no tiene código.' },
          { title: 'Verificar Identidad', description: 'Visualiza la foto del residente para verificar identidad cuando sea necesario.', icon: <Camera className="w-5 h-5" />, color: 'amber' },
        ],
      },
    ],
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', ring: 'ring-emerald-500/30' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', ring: 'ring-sky-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', ring: 'ring-amber-500/30' },
};

export const GuideView: React.FC = () => {
  const { currentUser } = useAuth();
  const currentRole = currentUser?.role || 'admin';
  const [expandedGuide, setExpandedGuide] = useState<string | null>(currentRole);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleDownloadPDF = async (role?: string) => {
    const targetRole = role || currentRole;
    const guide = GUIDES.find((g) => g.id === targetRole) || GUIDES[0];
    generateGuidePDF(guide);
  };

  const toggleGuide = (id: string) => {
    setExpandedGuide(expandedGuide === id ? null : id);
    setExpandedSection(null);
  };

  const toggleSection = (key: string) => {
    setExpandedSection(expandedSection === key ? null : key);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-500" />
            Guía de Uso
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aprende a usar Conjuntos App paso a paso. Selecciona tu rol para ver instrucciones personalizadas.
          </p>
        </div>
        <Button
          onClick={() => handleDownloadPDF()}
          icon={<Download className="w-4 h-4" />}
          className="shrink-0"
        >
          Descargar PDF
        </Button>
      </div>

      {/* Role Guides */}
      <div className="space-y-4">
        {GUIDES.map((guide) => {
          const isExpanded = expandedGuide === guide.id;
          const colors = colorMap[guide.color];
          return (
            <Card key={guide.id} className="overflow-hidden">
              {/* Guide Header */}
              <button
                onClick={() => toggleGuide(guide.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center ${colors.text}`}>
                    {guide.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-slate-900">{guide.label}</h3>
                    <p className="text-xs text-slate-500">{guide.sections.length} secciones • {guide.sections.reduce((a, s) => a + s.steps.length, 0)} pasos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownloadPDF(guide.id); }}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={`Descargar guía ${guide.label}`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                </div>
              </button>

              {/* Sections */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {guide.sections.map((section, si) => {
                    const sectionKey = `${guide.id}-${si}`;
                    const isSectionOpen = expandedSection === sectionKey;
                    return (
                      <div key={si} className="border-b border-slate-50 last:border-b-0">
                        <button
                          onClick={() => toggleSection(sectionKey)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{section.title}</span>
                          {isSectionOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </button>
                        {isSectionOpen && (
                          <div className="px-4 pb-4 space-y-3">
                            {section.steps.map((step, sti) => {
                              const stepColors = colorMap[step.color];
                              return (
                                <div key={sti} className="flex gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                                  <div className={`w-9 h-9 rounded-lg ${stepColors.bg} ${stepColors.border} border flex items-center justify-center ${stepColors.text} shrink-0 mt-0.5`}>
                                    {step.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-slate-800">{step.title}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.description}</p>
                                    {step.tip && (
                                      <div className={`mt-2 flex items-start gap-1.5 text-xs ${stepColors.text}`}>
                                        <Star className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span className="font-medium">{step.tip}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-slate-300 shrink-0">
                                    {String(sti + 1).padStart(2, '0')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Tips */}
      <Card className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4" />
          Consejos Rápidos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2">
            <Bell className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800">Notificaciones</p>
              <p className="text-[11px] text-emerald-600">Activa las notificaciones del navegador para recibir alertas en tiempo real.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Settings className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800">Actualizaciones</p>
              <p className="text-[11px] text-emerald-600">La app se actualiza automáticamente. Usa Ctrl+Shift+R si ves datos desactualizados.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-800">Seguridad</p>
              <p className="text-[11px] text-emerald-600">Nunca compartas tu contraseña. Los guardias deben cambiarla en su primer acceso.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
