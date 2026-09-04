import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { FlashMessage } from '../ui/FlashMessage';
import { playSuccessChime, playErrorBeep } from '../../lib/sound';
import {
  Building2,
  Shield,
  Users,
  QrCode,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Camera,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Crown,
} from 'lucide-react';
import { getApiBaseUrl, isStandalone } from '../../lib/config';
import { supabase } from '../../lib/supabaseClient';
import { fetchComplexesDirect } from '../../lib/supabaseRepo';

const FEATURES = [
  { icon: Shield, text: 'Control de acceso con QR y código' },
  { icon: Users, text: 'Gestión de residentes y apartamentos' },
  { icon: QrCode, text: 'Pases de visita en tiempo real' },
  { icon: Building2, text: 'Multi-conjunto con planes SaaS' },
];

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/30 días',
    description: 'Lo esencial para comenzar a operar sin costo.',
    features: ['Hasta 50 apartamentos', '2 guardas', '1 área común', 'Pases de visitante y anuncios'],
    highlighted: false,
    accent: 'slate',
  },
  {
    name: 'Pro',
    price: '$30',
    period: '/mes',
    description: 'Ideal para operación diaria con más control y métricas.',
    features: ['Hasta 200 apartamentos', '5 guardas', '5 áreas comunes', 'Reservas con calendario y portería avanzada'],
    highlighted: true,
    accent: 'cyan',
  },
  {
    name: 'Enterprise',
    price: '$100',
    period: '/mes',
    description: 'Escala para comunidades grandes con administración total.',
    features: ['Capacidad ampliada', 'Múltiples guardas', 'Reportes y auditoría', 'Atención premium y gestión avanzada'],
    highlighted: false,
    accent: 'violet',
  },
];

const apiBase = getApiBaseUrl();

export default function GuestLayout({ onLogin }) {
  const { login, registerWithCode, registerWithoutCode, resetPassword } = useAuth();
  const [directComplexes, setDirectComplexes] = useState([]);
  const [complexesError, setComplexesError] = useState(null);
  // Intenta usar DataContext si está disponible; si no, usa fetch directo
  let ctxComplexes = [];
  try { ctxComplexes = useData().complexes || []; } catch {}
  const complexes = ctxComplexes.length > 0 ? ctxComplexes : directComplexes;

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // En móvil standalone va directo a Supabase cloud, sin IP
      if (isStandalone() || !apiBase) {
        try {
          const data = await fetchComplexesDirect();
          if (!cancelled) {
            setDirectComplexes(data);
            if (data.length === 0) setComplexesError('No hay conjuntos activos. Pide al Super Admin que cree uno.');
          }
        } catch (err) {
          if (!cancelled) setComplexesError(err?.message || 'Error de conexión a Supabase');
        }
        return;
      }
      try {
        const res = await fetch(`${apiBase}/api/complexes`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (Array.isArray(data)) {
            setDirectComplexes(data);
            if (data.length === 0) setComplexesError('No hay conjuntos activos. Pide al Super Admin que cree uno.');
          } else setComplexesError('Respuesta inesperada del servidor');
        }
      } catch (err) {
        // Fallback a Supabase directo si el servidor no responde
        try {
          const data = await fetchComplexesDirect();
          if (!cancelled) {
            setDirectComplexes(data);
            if (data.length === 0) setComplexesError('No hay conjuntos activos.');
          }
        } catch (e) {
          if (!cancelled) setComplexesError(err?.message || 'Error de conexión');
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [flash, setFlash] = useState(null);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register with code form
  const [regCodeName, setRegCodeName] = useState('');
  const [regCodeEmail, setRegCodeEmail] = useState('');
  const [regCodePass, setRegCodePass] = useState('');
  const [regCodeCode, setRegCodeCode] = useState('');
  const [regCodeApt, setRegCodeApt] = useState('');
  const [regCodePhone, setRegCodePhone] = useState('');
  const [regCodeLoading, setRegCodeLoading] = useState(false);

  // Register without code form
  const [regNoName, setRegNoName] = useState('');
  const [regNoEmail, setRegNoEmail] = useState('');
  const [regNoPass, setRegNoPass] = useState('');
  const [regNoComplex, setRegNoComplex] = useState('');
  const [regNoApt, setRegNoApt] = useState('');
  const [regNoPhone, setRegNoPhone] = useState('');
  const [regNoFace, setRegNoFace] = useState(null);
  const [regNoLoading, setRegNoLoading] = useState(false);

  // Password recovery
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setFlash(null);
    setLoginLoading(true);
    const result = await login(loginEmail, loginPass);
    setLoginLoading(false);
    if (result.success) {
      playSuccessChime();
      onLogin();
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  const handleRegisterWithCode = async (e) => {
    e.preventDefault();
    setFlash(null);
    setRegCodeLoading(true);
    const result = await registerWithCode({
      name: regCodeName,
      email: regCodeEmail,
      password: regCodePass,
      complexCode: regCodeCode,
      apartment: regCodeApt,
      phone: regCodePhone,
    });
    setRegCodeLoading(false);
    if (result.success) {
      playSuccessChime();
      onLogin();
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  const handleRegisterWithoutCode = async (e) => {
    e.preventDefault();
    if (!regNoComplex) {
      setFlash({ type: 'error', message: 'Selecciona un conjunto residencial.' });
      return;
    }
    setFlash(null);
    setRegNoLoading(true);
    let facePhotoBase64 = null;
    if (regNoFace) {
      try {
        facePhotoBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(regNoFace);
        });
      } catch {}
    }
    const result = await registerWithoutCode({
      name: regNoName,
      email: regNoEmail,
      password: regNoPass,
      complexId: regNoComplex,
      apartment: regNoApt,
      phone: regNoPhone,
      facePhoto: facePhotoBase64,
    });
    setRegNoLoading(false);
    if (result.success) {
      playSuccessChime();
      setFlash({ type: 'success', message: result.message || 'Solicitud enviada. Espera aprobación del administrador.' });
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    setFlash(null);
    setRecoveryLoading(true);
    const result = await resetPassword(recoveryEmail, recoveryNewPass);
    setRecoveryLoading(false);
    if (result.success) {
      playSuccessChime();
      setFlash({ type: 'success', message: 'Contraseña restablecida correctamente.' });
      setShowRecovery(false);
      setRecoveryStep(1);
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  const tabs = [
    { id: 'login', label: 'Iniciar Sesión' },
    { id: 'register_code', label: 'Registrarse con Código' },
    { id: 'register_no_code', label: 'Registrarse sin Código' },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#0b1120_35%,#111827_100%)] text-slate-100 flex flex-col lg:flex-row">
      {/* Branding panel */}
      <div className="w-full lg:w-[45%] xl:w-[50%] bg-slate-950/70 backdrop-blur-xl flex flex-col justify-center p-5 sm:p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-slate-800 shadow-2xl shadow-slate-950/40">
        <div className="w-full max-w-lg mx-auto lg:mx-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Building2 className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Conjuntos App</h1>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">SaaS Premium</p>
            </div>
          </div>

          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-white mb-2 leading-snug break-words">
            Sistema Integral de Gestión Residencial
          </h2>
          <p className="text-sm text-slate-300 mb-8 leading-relaxed break-words">
            Administra tu conjunto residencial con seguridad, orden y claridad. Control de acceso, visitantes, denuncias, reservas y más.
          </p>

          <div className="space-y-4">
            {FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg shadow-slate-950/20">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center shrink-0 border border-cyan-500/20">
                    <Icon className="w-4 h-4 text-cyan-300" />
                  </div>
                  <span className="text-sm text-slate-200">{feat.text}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {PLANS.map((plan, i) => {
              const planTone = plan.highlighted
                ? 'bg-gradient-to-b from-cyan-500 via-emerald-500 to-emerald-600 border-cyan-300 text-white shadow-xl shadow-cyan-500/20'
                : plan.accent === 'violet'
                  ? 'bg-gradient-to-b from-violet-600/30 to-slate-900 border-violet-500/40 text-violet-100'
                  : 'bg-slate-900/80 border-slate-700 text-slate-200';

              return (
                <div
                  key={i}
                  className={`rounded-2xl p-3 border text-center transition-transform ${planTone} ${plan.highlighted ? 'scale-[1.02]' : ''}`}
                >
                  {plan.highlighted && (
                    <Badge variant="emerald" size="sm" className="mb-2 bg-white text-cyan-700 border-white">
                      <Star className="w-3 h-3" /> Popular
                    </Badge>
                  )}
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-80">{plan.name}</p>
                  <p className="text-xl font-black mt-2 leading-none">
                    {plan.price}
                    <span className="ml-1 text-[10px] font-medium opacity-80">{plan.period}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-[55%] xl:w-[50%] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-10 bg-slate-950/30">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Bienvenido</p>
            <h3 className="mt-2 text-2xl sm:text-3xl lg:text-[2.2rem] font-bold tracking-tight text-white leading-tight break-words">
              Accede a tu cuenta
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row gap-1 bg-slate-900/80 rounded-xl p-1 mb-6 border border-slate-700 shadow-lg shadow-slate-950/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setFlash(null);
                }}
                className={`flex-1 py-2 px-2 text-[10px] sm:text-xs font-medium rounded-lg transition-all cursor-pointer text-center leading-snug ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {flash && (
            <FlashMessage
              type={flash.type}
              message={flash.message}
              onClose={() => setFlash(null)}
            />
          )}

          {/* Login form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={loginLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Iniciar Sesión
              </Button>

            </form>
          )}

          {/* Register with code */}
          {activeTab === 'register_code' && (
            <form onSubmit={handleRegisterWithCode} className="space-y-4">
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                value={regCodeName}
                onChange={(e) => setRegCodeName(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={regCodeEmail}
                onChange={(e) => setRegCodeEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={regCodePass}
                  onChange={(e) => setRegCodePass(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                label="Código del conjunto"
                placeholder="Ej: RE-2025-ABCD"
                value={regCodeCode}
                onChange={(e) => setRegCodeCode(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
                required
              />
              <Input
                label="Apartamento"
                placeholder="Ej: Torre 1-Apt 301"
                value={regCodeApt}
                onChange={(e) => setRegCodeApt(e.target.value)}
                required
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="+57 300 123 4567"
                value={regCodePhone}
                onChange={(e) => setRegCodePhone(e.target.value)}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={regCodeLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Registrarse
              </Button>
            </form>
          )}

          {/* Register without code */}
          {activeTab === 'register_no_code' && (
            <form onSubmit={handleRegisterWithoutCode} className="space-y-4">
              <Input
                label="Nombre completo"
                placeholder="Juan Pérez"
                value={regNoName}
                onChange={(e) => setRegNoName(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={regNoEmail}
                onChange={(e) => setRegNoEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <div className="relative">
                <Input
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={regNoPass}
                  onChange={(e) => setRegNoPass(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Conjunto
                </label>
                <select
                  value={regNoComplex}
                  onChange={(e) => setRegNoComplex(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm py-2.5 px-3.5 transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                >
                  <option value="">{complexes.length === 0 ? (complexesError || 'Cargando conjuntos...') : 'Selecciona un conjunto'}</option>
                  {complexes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.code ? `— ${c.code}` : ''}
                    </option>
                  ))}
                </select>
                {complexes.length === 0 && complexesError && (
                  <p className="text-xs text-amber-400 mt-1">{complexesError}</p>
                )}
              </div>
              <Input
                label="Apartamento"
                placeholder="Ej: Torre 1-Apt 301"
                value={regNoApt}
                onChange={(e) => setRegNoApt(e.target.value)}
                required
              />
              <Input
                label="Teléfono"
                type="tel"
                placeholder="+57 300 123 4567"
                value={regNoPhone}
                onChange={(e) => setRegNoPhone(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Foto facial (opcional)
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 border-dashed cursor-pointer hover:border-emerald-500/50 transition-colors">
                  <Camera className="w-5 h-5 text-slate-500" />
                  <span className="text-xs text-slate-400">
                    {regNoFace ? regNoFace.name : 'Subir foto para verificación'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => setRegNoFace(e.target.files[0])}
                  />
                </label>
              </div>
              <Button
                type="submit"
                className="w-full"
                isLoading={regNoLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Enviar Solicitud
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Password Recovery Modal */}
      <Modal
        isOpen={showRecovery}
        onClose={() => {
          setShowRecovery(false);
          setRecoveryStep(1);
          setFlash(null);
        }}
        title="Recuperar Contraseña"
        description="Te enviaremos un código para restablecer tu contraseña"
        maxWidth="sm"
      >
        <form onSubmit={handleRecovery} className="space-y-4">
          {recoveryStep === 1 && (
            <>
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <Button
                type="button"
                className="w-full"
                onClick={() => setRecoveryStep(2)}
              >
                Enviar Código
              </Button>
            </>
          )}
          {recoveryStep === 2 && (
            <>
              <Input
                label="Código de verificación"
                placeholder="123456"
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
                required
              />
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={recoveryNewPass}
                onChange={(e) => setRecoveryNewPass(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
                minLength={8}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={recoveryLoading}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Restablecer Contraseña
              </Button>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
