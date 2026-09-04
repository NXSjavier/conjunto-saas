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
  ChevronRight,
  KeyRound,
  ShieldAlert,
  ArrowLeft,
  Key,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { FlashMessage } from '../ui/FlashMessage';
import { Modal } from '../ui/Modal';

export const GuestLayout: React.FC = () => {
  const { login, requestPasswordReset, verifyCodeAndResetPassword, registerWithCode, registerWithoutCode } = useAuth();
  const { complexes } = useData();

  const [mode, setMode] = useState<'login' | 'register_code' | 'register_no_code'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Password recovery modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'code_and_password'>('email');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [generatedCodeNotification, setGeneratedCodeNotification] = useState<string | null>(null);

  // Register with code state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCode, setRegCode] = useState('');
  const [regAptNumber, setRegAptNumber] = useState('');

  // Register without code state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplexId, setSelectedComplexId] = useState<number | null>(null);
  const [noCodePassword, setNoCodePassword] = useState('');
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
    if (!email.trim() || !password.trim()) {
      setFlash({ message: 'Por favor ingresa tu correo y tu contraseña', type: 'error' });
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success) {
        setFlash({ message: res.message || 'Error al iniciar sesión', type: 'error' });
      }
    }, 300);
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setFlash({ message: 'Por favor ingresa tu correo electrónico', type: 'error' });
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotEmail);
      setIsForgotLoading(false);
      if (res.success) {
        setForgotStep('code_and_password');
        if (res.generatedCode) {
          setGeneratedCodeNotification(res.generatedCode);
        }
        setFlash({ message: res.message, type: 'success' });
      } else {
        setFlash({ message: res.message, type: 'error' });
      }
    } catch {
      setIsForgotLoading(false);
      setFlash({ message: 'Ocurrió un error al solicitar el código', type: 'error' });
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotCode.trim() || !forgotNewPass.trim()) {
      setFlash({ message: 'Por favor ingresa el código y la nueva contraseña', type: 'error' });
      return;
    }
    if (forgotCode.trim().length !== 4) {
      setFlash({ message: 'El código de seguridad debe tener exactamente 4 dígitos', type: 'error' });
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setFlash({ message: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }

    setIsForgotLoading(true);
    try {
      const res = await verifyCodeAndResetPassword(forgotEmail, forgotCode, forgotNewPass);
      setIsForgotLoading(false);
      if (res.success) {
        setFlash({ message: res.message, type: 'success' });
        setEmail(forgotEmail);
        setPassword(forgotNewPass);
        setIsForgotModalOpen(false);
        setForgotStep('email');
        setForgotCode('');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setGeneratedCodeNotification(null);
      } else {
        setFlash({ message: res.message, type: 'error' });
      }
    } catch {
      setIsForgotLoading(false);
      setFlash({ message: 'Error al cambiar la contraseña', type: 'error' });
    }
  };

  const handleRegisterWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regCode.trim() || !regAptNumber.trim() || !regPassword.trim()) {
      setFlash({ message: 'Por favor completa todos los campos requeridos', type: 'error' });
      return;
    }
    if (regPassword.length < 6) {
      setFlash({ message: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
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
        password: regPassword,
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
    if (!regName.trim() || !regEmail.trim() || !selectedComplexId || !reqBlockOrApt.trim() || !noCodePassword.trim()) {
      setFlash({ message: 'Por favor completa todos los datos requeridos y selecciona tu conjunto', type: 'error' });
      return;
    }
    if (noCodePassword.length < 6) {
      setFlash({ message: 'La contraseña debe tener al menos 6 caracteres', type: 'error' });
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
        password: noCodePassword,
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
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
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
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-emerald-950/95" />

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Conjuntos App</h1>
                <p className="text-xs text-emerald-400 font-medium">Gestión Residencial Profesional</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-6 leading-relaxed">
              Sistema integral para la administración, seguridad en garita y comunicación comunitaria en condominios y conjuntos cerrados.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="relative z-10 space-y-4 my-auto">
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <span>Control de accesos y pases con código seguro</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <span>Notificaciones en segundo plano y alertas nativas</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <span>Validación facial y registro para residentes</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-200">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Check className="h-4 w-4" />
              </div>
              <span>Comunicados oficiales y reservas en tiempo real</span>
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="relative z-10 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <KeyRound className="h-4 w-4" />
              Autenticación Segura
            </span>
            <span>Versión de Producción</span>
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
            <p className="text-xs text-slate-500">Gestión Residencial Digital</p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">
            {/* Mode Selector Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 text-xs font-semibold">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setMode('register_code')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
                  mode === 'register_code' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Con Código
              </button>
              <button
                onClick={() => setMode('register_no_code')}
                className={`flex-1 py-2.5 rounded-xl transition-all cursor-pointer ${
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
                  <h3 className="text-lg font-bold text-slate-900">Iniciar Sesión</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ingresa tu correo y contraseña registrados</p>
                </div>

                <Input
                  label="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@conjunto.com"
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

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Recordar sesión</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setForgotStep('email');
                      setIsForgotModalOpen(true);
                    }}
                    className="text-emerald-700 font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isLoading}
                  className="w-full mt-2"
                >
                  Ingresar a la Plataforma
                </Button>
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
                    label="Código del Conjunto Residencial"
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
                        <span className="text-[11px] text-amber-600 font-medium">
                          Código no encontrado en el sistema.
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

                <Input
                  label="Crear Contraseña"
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  icon={<Lock className="h-4 w-4" />}
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

                {/* Complex Search */}
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
                    label="Correo Electrónico"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="santiago@ejemplo.com"
                    icon={<Mail className="h-4 w-4" />}
                    required
                  />
                </div>

                <Input
                  label="Crear Contraseña"
                  type="password"
                  value={noCodePassword}
                  onChange={(e) => setNoCodePassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  icon={<Lock className="h-4 w-4" />}
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Teléfono Móvil"
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
                    2. Foto de Rostro para Identificación de Seguridad
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
                          Tomar Foto
                        </button>
                        <label className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer inline-flex items-center">
                          <span>Subir Imagen</span>
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
          </div>

          {/* SaaS Subscription Plan Cards */}
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

      {/* PASSWORD RECOVERY MODAL (4-DIGIT CODE, MAX 3 PER MONTH) */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Recuperación de Contraseña"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
            <ShieldAlert className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Seguridad del Sistema</p>
              <p className="text-[11px] text-emerald-700">
                La aplicación genera un código seguro de 4 dígitos. Máximo 3 cambios de contraseña por mes por usuario.
              </p>
            </div>
          </div>

          {generatedCodeNotification && (
            <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-700 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-emerald-400" />
                <span className="text-xs">Código de Seguridad Generado:</span>
              </div>
              <span className="font-mono font-extrabold text-lg text-emerald-400 tracking-widest">
                {generatedCodeNotification}
              </span>
            </div>
          )}

          {forgotStep === 'email' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-xs text-slate-600">
                Ingresa el correo electrónico asociado a tu cuenta para recibir el código de verificación de 4 números.
              </p>

              <Input
                label="Correo Electrónico Registrado"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="ejemplo@conjunto.com"
                icon={<Mail className="h-4 w-4" />}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsForgotModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isForgotLoading}
                  icon={<KeyRound className="h-4 w-4" />}
                >
                  Generar Código de 4 Dígitos
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <p className="text-xs text-slate-600">
                Hemos generado tu código de seguridad para <strong>{forgotEmail}</strong>. Ingrésalo a continuación junto con tu nueva clave:
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de 4 Números (OTP)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="4829"
                  className="w-full text-center text-2xl font-mono font-extrabold tracking-widest py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 bg-white"
                  required
                />
              </div>

              <Input
                label="Nueva Contraseña"
                type="password"
                value={forgotNewPass}
                onChange={(e) => setForgotNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                icon={<Lock className="h-4 w-4" />}
                required
              />

              <Input
                label="Confirmar Nueva Contraseña"
                type="password"
                value={forgotConfirmPass}
                onChange={(e) => setForgotConfirmPass(e.target.value)}
                placeholder="Repite la contraseña"
                icon={<Lock className="h-4 w-4" />}
                required
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep('email')}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Cambiar Correo
                </button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isForgotLoading}
                  >
                    Guardar Contraseña
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};
