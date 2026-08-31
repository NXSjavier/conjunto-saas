import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Camera,
  Check,
  Search,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { FlashMessage } from '../ui/FlashMessage';

export const GuestLayout: React.FC = () => {
  const { login, loginAsRole, registerWithCode, registerWithoutCode } = useAuth();
  const { complexes } = useData();

  const [mode, setMode] = useState<'login' | 'register_code' | 'register_no_code'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Register with code state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regAptNumber, setRegAptNumber] = useState('');

  // Register without code state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplexId, setSelectedComplexId] = useState<number | null>(null);
  const [reqBlockOrApt, setReqBlockOrApt] = useState('');
  const [facePhoto, setFacePhoto] = useState<string | null>(null);

  // Check code in real time
  const matchedComplex = complexes.find(
    (c) => c.code.trim().toUpperCase() === regCode.trim().toUpperCase()
  );

  // Filter complexes for search
  const searchResults = searchQuery.trim().length >= 2
    ? complexes.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setFlash({ message: 'Ingresa tu correo electrónico', type: 'error' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setFlash({ message: res.message || 'Error al iniciar sesión', type: 'error' });
      }
    }, 400);
  };

  const handleRegisterWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regCode.trim() || !regAptNumber.trim()) {
      setFlash({ message: 'Por favor completa todos los campos requeridos', type: 'error' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const res = registerWithCode({
        name: regName,
        email: regEmail,
        phone: regPhone,
        code: regCode,
        apartmentNumber: regAptNumber,
      });
      setIsLoading(false);
      if (res.success) {
        setFlash({ message: '¡Registro exitoso! Bienvenido a Conjuntos App.', type: 'success' });
      } else {
        setFlash({ message: res.message || 'Error en el registro', type: 'error' });
      }
    }, 400);
  };

  const handleRegisterWithoutCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !selectedComplexId || !reqBlockOrApt.trim()) {
      setFlash({ message: 'Por favor completa todos los datos requeridos y selecciona tu conjunto', type: 'error' });
      return;
    }
    if (!facePhoto) {
      setFlash({ message: 'Por favor toma o sube una foto de tu rostro para la verificación de seguridad', type: 'error' });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const res = registerWithoutCode({
        name: regName,
        email: regEmail,
        phone: regPhone,
        complexId: selectedComplexId,
        requestedBlockOrApt: reqBlockOrApt,
        facePhoto,
      });
      setIsLoading(false);
      if (res.success) {
        setFlash({ message: res.message || 'Registro enviado para aprobación.', type: 'success' });
        setMode('login');
      } else {
        setFlash({ message: res.message || 'Error al enviar registro', type: 'error' });
      }
    }, 500);
  };

  // Sample photo generator or upload simulator
  const handleSimulatePhoto = () => {
    const sampleFaces = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    ];
    const picked = sampleFaces[Math.floor(Math.random() * sampleFaces.length)];
    setFacePhoto(picked);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setFlash({ message: 'La imagen excede el límite máximo de 2MB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFacePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Branding Panel (desktop / tablet) */}
        <div className="hidden lg:flex lg:col-span-5 relative flex-col justify-between overflow-hidden rounded-3xl p-8 h-[640px] shadow-2xl bg-slate-950 border border-slate-800 text-white">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-30 blur-xs"
            style={{
              backgroundImage: 'url("https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-emerald-950/90" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Conjuntos App</h1>
                <p className="text-xs text-emerald-400 font-medium">Gestión Residencial Digital</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-6 leading-relaxed">
              La plataforma móvil integral para condominios, edificios y conjuntos residenciales. Control de garita en tiempo real, reservas y comunicados.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 space-y-3.5 my-auto">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Pases de visitas con código seguro <strong>XXXX-XXXX</strong></span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Validación garita con alerta sonora de 880Hz</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Aprobación de residentes con foto de rostro</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-6 w-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-3.5 w-3.5" />
              </div>
              <span>Comentarios en tiempo real y recibos en PDF</span>
            </div>
          </div>

          {/* Quick Demo Switcher on panel */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              <span>Acceso Rápido Demo:</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => loginAsRole('super_admin')}
                className="text-left px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-purple-950/80 border border-purple-900/50 text-[11px] text-purple-200 transition-all cursor-pointer"
              >
                <span className="font-bold block text-purple-300">Super Admin</span>
                <span className="text-[9px] text-slate-400">superadmin@conjuntos.app</span>
              </button>
              <button
                onClick={() => loginAsRole('admin')}
                className="text-left px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-emerald-950/80 border border-emerald-900/50 text-[11px] text-emerald-200 transition-all cursor-pointer"
              >
                <span className="font-bold block text-emerald-300">Admin Conjunto</span>
                <span className="text-[9px] text-slate-400">admin@LP.app</span>
              </button>
              <button
                onClick={() => loginAsRole('resident')}
                className="text-left px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-sky-950/80 border border-sky-900/50 text-[11px] text-sky-200 transition-all cursor-pointer"
              >
                <span className="font-bold block text-sky-300">Residente</span>
                <span className="text-[9px] text-slate-400">residente@lp.app</span>
              </button>
              <button
                onClick={() => loginAsRole('guard')}
                className="text-left px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-950/80 border border-amber-900/50 text-[11px] text-amber-200 transition-all cursor-pointer"
              >
                <span className="font-bold block text-amber-300">Guardia Garita</span>
                <span className="text-[9px] text-slate-400">guardia@lp.app</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="w-full lg:col-span-7 max-w-md mx-auto">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-6">
            <div className="h-12 w-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white mx-auto mb-2">
              <Building2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Conjuntos App</h2>
            <p className="text-xs text-slate-500">Gestión Residencial para Android</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
            {/* Mode Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-semibold">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setMode('register_code')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'register_code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Con Código
              </button>
              <button
                onClick={() => setMode('register_no_code')}
                className={`flex-1 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'register_no_code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sin Código
              </button>
            </div>

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Bienvenido de nuevo</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ingresa tus credenciales para acceder a tu cuenta</p>
                </div>

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@conjuntos.app"
                  icon={<Mail className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Contraseña"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  icon={<Lock className="h-4 w-4" />}
                  required
                />

                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Recordar sesión</span>
                  </label>
                  <span className="text-emerald-600 hover:underline cursor-pointer">¿Olvidaste tu contraseña?</span>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  className="w-full mt-2"
                >
                  Iniciar Sesión
                </Button>

                {/* Mobile Quick Demo Switcher */}
                <div className="lg:hidden pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Acceso Rápido con Cuentas Demo:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => loginAsRole('super_admin')}
                      className="p-2 rounded-xl bg-purple-50 text-purple-700 font-semibold border border-purple-200 text-left"
                    >
                      👑 Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => loginAsRole('admin')}
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-left"
                    >
                      🏢 Administrador
                    </button>
                    <button
                      type="button"
                      onClick={() => loginAsRole('resident')}
                      className="p-2 rounded-xl bg-sky-50 text-sky-700 font-semibold border border-sky-200 text-left"
                    >
                      🏠 Residente
                    </button>
                    <button
                      type="button"
                      onClick={() => loginAsRole('guard')}
                      className="p-2 rounded-xl bg-amber-50 text-amber-700 font-semibold border border-amber-200 text-left"
                    >
                      👮 Guardia
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* REGISTER WITH CODE FORM */}
            {mode === 'register_code' && (
              <form onSubmit={handleRegisterWithCode} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Registro con Código</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ingresa el código proporcionado por tu administración</p>
                </div>

                <div>
                  <Input
                    label="Código de Conjunto Residencial"
                    value={regCode}
                    onChange={(e) => setRegCode(e.target.value.toUpperCase())}
                    placeholder="Ej: LP-2026-X8T5"
                    icon={<KeyRound className="h-4 w-4" />}
                    required
                  />
                  {regCode.trim() && (
                    <div className="mt-1.5">
                      {matchedComplex ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-medium">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>Conjunto encontrado: <strong>{matchedComplex.name}</strong> ({matchedComplex.city})</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Demo código disponible: <strong>LP-2026-X8T5</strong>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  label="Nombre Completo"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Juan Pérez"
                  icon={<UserIcon className="h-4 w-4" />}
                  required
                />

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="juan.perez@ejemplo.com"
                  icon={<Mail className="h-4 w-4" />}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Teléfono Móvil"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    icon={<Phone className="h-4 w-4" />}
                  />
                  <Input
                    label="Torre / N° Depto"
                    value={regAptNumber}
                    onChange={(e) => setRegAptNumber(e.target.value)}
                    placeholder="Torre A - 302"
                    icon={<Building2 className="h-4 w-4" />}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  disabled={!matchedComplex}
                  className="w-full mt-2"
                >
                  Registrarse e Ingresar
                </Button>
              </form>
            )}

            {/* REGISTER WITHOUT CODE FORM */}
            {mode === 'register_no_code' && (
              <form onSubmit={handleRegisterWithoutCode} className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Registro sin Código</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Busca tu conjunto y envía tu foto para verificación del administrador
                  </p>
                </div>

                {/* Complex Search with Debounce */}
                <div>
                  <Input
                    label="1. Buscar Conjunto Residencial"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedComplexId(null);
                    }}
                    placeholder="Escribe el nombre o ciudad..."
                    icon={<Search className="h-4 w-4" />}
                  />

                  {searchQuery.trim().length >= 2 && !selectedComplexId && (
                    <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200 max-h-36 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <p className="p-3 text-xs text-slate-400 text-center">No se encontraron conjuntos</p>
                      ) : (
                        searchResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedComplexId(c.id);
                              setSearchQuery(c.name);
                            }}
                            className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors text-xs cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 block">{c.name}</span>
                                <span className="text-[10px] text-slate-500">{c.city} - {c.address}</span>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {selectedComplexId && (
                    <div className="mt-2 flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                      <span className="font-semibold">Conjunto seleccionado: {searchQuery}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplexId(null);
                          setSearchQuery('');
                        }}
                        className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Nombre Completo"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Santiago Morales"
                    icon={<UserIcon className="h-4 w-4" />}
                    required
                  />
                  <Input
                    label="Correo"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="santiago@ejemplo.com"
                    icon={<Mail className="h-4 w-4" />}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Teléfono"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+57 319 888 6677"
                    icon={<Phone className="h-4 w-4" />}
                  />
                  <Input
                    label="Manzana / Torre y Depto"
                    value={reqBlockOrApt}
                    onChange={(e) => setReqBlockOrApt(e.target.value)}
                    placeholder="Manzana 23 - Casa 12"
                    icon={<Building2 className="h-4 w-4" />}
                    required
                  />
                </div>

                {/* Face Photo Capture / Simulator */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    2. Foto de Rostro para Seguridad (Requerido)
                  </label>
                  <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div className="h-16 w-16 rounded-xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                      {facePhoto ? (
                        <img src={facePhoto} alt="Rostro" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-[11px] text-slate-500">
                        El guardia y administrador usarán esta foto para verificar tu identidad al ingresar.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSimulatePhoto}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 cursor-pointer"
                        >
                          Generar Foto
                        </button>
                        <label className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center">
                          <span>Subir JPG/PNG</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  disabled={!selectedComplexId || !facePhoto}
                  className="w-full mt-2"
                >
                  Enviar Solicitud de Aprobación
                </Button>
              </form>
            )}

            {/* Demo Credentials Box */}
            <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center">
              <p className="text-[11px] text-slate-400">
                Credenciales Demo: <strong>password</strong> para todos los usuarios.
              </p>
            </div>
          </div>

          {/* 3 SaaS Subscription Plan Cards (Section 3.6) */}
          <div className="mt-8">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">
              Planes Disponibles para Conjuntos Residenciales
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Free */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Free</span>
                    <Badge variant="slate">30 días</Badge>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">$0</div>
                  <ul className="text-[11px] text-slate-600 mt-2 space-y-1">
                    <li>• Hasta 50 departamentos</li>
                    <li>• 2 Guardias de turno</li>
                    <li>• 1 Área común</li>
                    <li>• Soporte por Email</li>
                  </ul>
                </div>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-2xl border-2 border-emerald-500 p-4 text-left shadow-md relative flex flex-col justify-between">
                <div className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-xs uppercase tracking-wider">
                  Más popular
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Pro</span>
                    <Badge variant="emerald">Recomendado</Badge>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-700 mt-1">
                    $24 <span className="text-[10px] font-normal text-slate-500">/ mes (~96k COP)</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 mt-2 space-y-1">
                    <li>• Hasta 200 departamentos</li>
                    <li>• 5 Guardias de garita</li>
                    <li>• 5 Áreas comunes</li>
                    <li>• Módulo de Reportes</li>
                    <li>• Soporte WhatsApp</li>
                  </ul>
                </div>
              </div>

              {/* Enterprise */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Enterprise</span>
                    <Badge variant="purple">Corporativo</Badge>
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 mt-1">
                    $49 <span className="text-[10px] font-normal text-slate-500">/ mes (~196k COP)</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 mt-2 space-y-1">
                    <li>• Departamentos Ilimitados</li>
                    <li>• Guardias Ilimitados</li>
                    <li>• Áreas Ilimitadas</li>
                    <li>• API & Webhooks</li>
                    <li>• Soporte 24/7 VIP</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
