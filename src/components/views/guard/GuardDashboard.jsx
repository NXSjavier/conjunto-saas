import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { PageHeader } from '../../ui/PageHeader';
import { 
  LogIn, 
  LogOut, 
  Megaphone, 
  Clock, 
  User, 
  CheckCircle2,
  QrCode,
  KeyRound,
  Shield,
  AlertCircle,
  Check,
  X,
  Search,
  Users
} from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { playSuccessChime, playNotificationBeep, playErrorBeep } from '../../../lib/sound';
import { triggerHaptic } from '../../../lib/sound';

export const GuardDashboard = ({ onNavigate }) => {
  const { currentUser, currentComplex } = useAuth();
  const { 
    visitors, 
    updateVisitorStatus, 
    announcements,
    changePassword
  } = useData();

  // Estados para verificación de código
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showVerification, setShowVerification] = useState(true);

  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para cambio de contraseña
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Visitantes pendientes
  const pendingVisitors = useMemo(() => {
    return visitors.filter(
      (v) => v.complex_id === currentComplex?.id && v.status === 'registered'
    );
  }, [visitors, currentComplex]);

  // Historial de hoy
  const todayLog = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return visitors
      .filter(
        (v) =>
          v.complex_id === currentComplex?.id &&
          ((v.checked_in_at && v.checked_in_at.startsWith(today)) ||
            (v.checked_out_at && v.checked_out_at.startsWith(today)) ||
            v.status === 'in')
      )
      .sort((a, b) => {
        const aTime = a.checked_in_at || a.created_at || '';
        const bTime = b.checked_in_at || b.created_at || '';
        return new Date(bTime) - new Date(aTime);
      });
  }, [visitors, currentComplex]);

  // Cálculo de estadísticas (AHORA después de todayLog)
  const stats = useMemo(() => {
    const totalToday = todayLog.length;
    const activeInside = visitors.filter(v => 
      v.complex_id === currentComplex?.id && v.status === 'in'
    ).length;
    const pending = pendingVisitors.length;
    const totalVisitors = visitors.filter(v => 
      v.complex_id === currentComplex?.id
    ).length;

    return { totalToday, activeInside, pending, totalVisitors };
  }, [visitors, currentComplex, todayLog, pendingVisitors]);

  // Historial filtrado por búsqueda
  const filteredLog = useMemo(() => {
    if (!searchTerm.trim()) return todayLog;
    
    const term = searchTerm.toLowerCase().trim();
    return todayLog.filter(v => 
      v.visitor_name.toLowerCase().includes(term) ||
      v.code.toLowerCase().includes(term) ||
      v.destination_apartment?.toLowerCase().includes(term) ||
      v.resident_name?.toLowerCase().includes(term)
    );
  }, [todayLog, searchTerm]);

  // Comunicados de hoy
  const todayAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.complex_id === currentComplex?.id);
  }, [announcements, currentComplex]);

  // Función para verificar código
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationResult(null);

    const cleanCode = verificationCode.trim().toUpperCase();
    
    if (!cleanCode) {
      setVerificationResult({
        type: 'error',
        message: 'Por favor ingresa un código'
      });
      setIsVerifying(false);
      return;
    }

    // Buscar el visitante por código
    const visitor = visitors.find(
      (v) => 
        v.complex_id === currentComplex?.id &&
        (v.code.toUpperCase() === cleanCode || 
         v.code.toUpperCase() === `VIS-${cleanCode}` ||
         v.code === cleanCode)
    );

    if (!visitor) {
      setVerificationResult({
        type: 'error',
        message: 'Código no válido. Verifica e intenta nuevamente.'
      });
      playErrorBeep();
      setIsVerifying(false);
      return;
    }

    // Verificar si ya está dentro o ya salió
    if (visitor.status === 'in') {
      setVerificationResult({
        type: 'warning',
        message: 'Este visitante ya está dentro del conjunto.',
        visitor: visitor
      });
      playNotificationBeep();
      setIsVerifying(false);
      return;
    }

    if (visitor.status === 'out') {
      setVerificationResult({
        type: 'warning',
        message: 'Este visitante ya salió del conjunto.',
        visitor: visitor
      });
      playNotificationBeep();
      setIsVerifying(false);
      return;
    }

    // Código válido - mostrar información del visitante
    setVerificationResult({
      type: 'success',
      message: 'Código válido. ¿Permitir ingreso?',
      visitor: visitor
    });
    playSuccessChime();
    triggerHaptic();
    setIsVerifying(false);
  };

  // Función para confirmar ingreso desde verificación
  const handleConfirmCheckIn = async (visitorId) => {
    await updateVisitorStatus(visitorId, 'in');
    playSuccessChime();
    triggerHaptic();
    
    setVerificationResult(null);
    setVerificationCode('');
  };

  // Función para cancelar verificación
  const handleCancelVerification = () => {
    setVerificationResult(null);
    setVerificationCode('');
  };

  // Funciones de entrada/salida
  const handleCheckIn = async (visitor) => {
    await updateVisitorStatus(visitor.id, 'in');
    playSuccessChime();
    triggerHaptic();
  };

  const handleCheckOut = async (visitor) => {
    await updateVisitorStatus(visitor.id, 'out');
    playNotificationBeep();
    triggerHaptic();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (!newPassword.trim()) {
      setPasswordError('Ingresa una nueva contraseña');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    const result = await changePassword(currentUser.id, null, newPassword);
    if (result.success) {
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(false);
      }, 1500);
    } else {
      setPasswordError(result.error || 'Error al cambiar contraseña');
    }
  };

  const openPasswordModal = () => {
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess(false);
    setIsPasswordModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portería"
        subtitle={currentComplex?.name || 'Panel de control'}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={openPasswordModal}
            icon={<KeyRound className="w-4 h-4" />}
          >
            Cambiar Contraseña
          </Button>
        }
      />

      {/* 📊 Panel de Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Dentro ahora</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.activeInside}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-sky-500/5 border-sky-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Pendientes</p>
              <p className="text-2xl font-bold text-sky-400">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total hoy</p>
              <p className="text-2xl font-bold text-amber-400">{stats.totalToday}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Registrados</p>
              <p className="text-2xl font-bold text-purple-400">{stats.totalVisitors}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* 📌 FRANJA DE VERIFICACIÓN DE CÓDIGO */}
      {showVerification && (
        <Card 
          title="Verificador de Código" 
          subtitle="Ingresa el código del visitante para validar su acceso"
          className="border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-950/30 to-slate-900/50"
        >
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <QrCode className="w-4 h-4 text-slate-500" />
                </div>
                <Input
                  type="text"
                  placeholder="Ej: VIS-X8T5 o X8T5"
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.toUpperCase());
                    setVerificationResult(null);
                  }}
                  className="pl-10 font-mono text-lg tracking-wider"
                  autoFocus
                  disabled={isVerifying}
                />
              </div>
              <Button 
                type="submit" 
                isLoading={isVerifying}
                icon={<Search className="w-4 h-4" />}
                className="min-w-[120px]"
              >
                Verificar
              </Button>
            </div>

            {/* Resultado de la verificación */}
            {verificationResult && (
              <div className={`
                p-4 rounded-xl border
                ${verificationResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' : ''}
                ${verificationResult.type === 'error' ? 'bg-rose-500/10 border-rose-500/30' : ''}
                ${verificationResult.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30' : ''}
              `}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {verificationResult.type === 'success' && (
                      <Check className="w-5 h-5 text-emerald-400" />
                    )}
                    {verificationResult.type === 'error' && (
                      <X className="w-5 h-5 text-rose-400" />
                    )}
                    {verificationResult.type === 'warning' && (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`
                      text-sm font-medium
                      ${verificationResult.type === 'success' ? 'text-emerald-400' : ''}
                      ${verificationResult.type === 'error' ? 'text-rose-400' : ''}
                      ${verificationResult.type === 'warning' ? 'text-amber-400' : ''}
                    `}>
                      {verificationResult.message}
                    </p>

                    {verificationResult.visitor && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-300 font-medium">
                              {verificationResult.visitor.visitor_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-slate-400 font-mono">
                              {verificationResult.visitor.code}
                            </span>
                          </div>
                          {verificationResult.visitor.destination_apartment && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Destino:</span>
                              <span className="text-slate-300">
                                {verificationResult.visitor.destination_apartment}
                              </span>
                            </div>
                          )}
                          {verificationResult.visitor.purpose && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Motivo:</span>
                              <span className="text-slate-300">
                                {verificationResult.visitor.purpose}
                              </span>
                            </div>
                          )}
                          {verificationResult.visitor.resident_name && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">Residente:</span>
                              <span className="text-slate-300">
                                {verificationResult.visitor.resident_name}
                              </span>
                            </div>
                          )}
                        </div>

                        {verificationResult.type === 'success' && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-800">
                            <Button
                              size="sm"
                              onClick={() => handleConfirmCheckIn(verificationResult.visitor.id)}
                              icon={<LogIn className="w-3.5 h-3.5" />}
                              className="bg-emerald-600 hover:bg-emerald-700"
                            >
                              Permitir Ingreso
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelVerification}
                            >
                              Cancelar
                            </Button>
                          </div>
                        )}

                        {verificationResult.type === 'warning' && (
                          <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-800">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelVerification}
                            >
                              Cerrar
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {verificationCode.length >= 4 && !verificationResult && !isVerifying && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                Presiona Enter o Verificar para validar el código
              </p>
            )}
          </form>
        </Card>
      )}

      {/* 🔍 Búsqueda simple */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            type="text"
            placeholder="Buscar visitante por nombre, código o destino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {/* Visitantes Pendientes */}
      <Card title="Visitantes Esperados" subtitle="Presiona Ingreso cuando lleguen">
        {pendingVisitors.length === 0 ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No hay visitantes pendientes</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pendingVisitors.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">{v.visitor_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{v.code}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {v.destination_apartment ? `🏠 ${v.destination_apartment}` : ''} 
                      {v.purpose ? ` · ${v.purpose}` : ''}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCheckIn(v)}
                  className="bg-emerald-600 hover:bg-emerald-700 px-4 flex-shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  Ingreso
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Visitantes Dentro */}
      {visitors.filter((v) => v.complex_id === currentComplex?.id && v.status === 'in').length > 0 && (
        <Card title="Dentro del Conjunto" subtitle="Registrar salida">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {visitors
              .filter((v) => v.complex_id === currentComplex?.id && v.status === 'in')
              .map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-100 truncate">{v.visitor_name}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{v.code}</p>
                      <p className="text-[10px] text-emerald-400 truncate">
                        Entró: {v.checked_in_at ? formatDate(v.checked_in_at) : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCheckOut(v)}
                    className="px-4 flex-shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Salida
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Historial de Hoy con búsqueda */}
      <Card title="Historial de Hoy" subtitle="Entradas y salidas registradas">
        {filteredLog.length === 0 ? (
          <div className="py-6 text-center">
            <Clock className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {searchTerm ? 'No hay resultados para tu búsqueda' : 'Sin movimientos hoy'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredLog.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    v.status === 'in'
                      ? 'bg-emerald-500/10 border border-emerald-500/20'
                      : v.status === 'out'
                        ? 'bg-slate-500/10 border border-slate-500/20'
                        : 'bg-slate-500/10 border border-slate-500/20'
                  }`}>
                    {v.status === 'in' ? (
                      <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{v.visitor_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{v.code}</p>
                    {v.destination_apartment && (
                      <p className="text-[10px] text-slate-500 truncate">
                        🏠 {v.destination_apartment}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  {v.checked_in_at && (
                    <p className="text-[10px] text-emerald-400">
                      Entrada: {formatDate(v.checked_in_at)}
                    </p>
                  )}
                  {v.checked_out_at && (
                    <p className="text-[10px] text-slate-500">
                      Salida: {formatDate(v.checked_out_at)}
                    </p>
                  )}
                  {!v.checked_in_at && !v.checked_out_at && (
                    <p className="text-[10px] text-slate-600">
                      {v.created_at ? formatDate(v.created_at) : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Comunicados */}
      {todayAnnouncements.length > 0 && (
        <Card title="Comunicados" subtitle="Avisos del conjunto">
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {todayAnnouncements.map((a) => (
              <div
                key={a.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <p className="text-sm font-semibold text-slate-100 truncate">{a.title}</p>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{a.content}</p>
                <p className="text-[10px] text-slate-600 mt-1">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Cambiar Contraseña */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Cambiar Contraseña"
        description="Recomendación: usa tu número de cédula como contraseña para recordarla fácilmente."
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordSuccess ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-emerald-400 font-medium">Contraseña actualizada correctamente</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                <p className="text-xs text-sky-300">
                  <strong>Recomendación:</strong> Usa tu número de cédula como contraseña para que sea fácil de recordar.
                </p>
              </div>

              <Input
                label="Nueva Contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ej: tu número de cédula"
                required
              />

              <Input
                label="Confirmar Contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />

              {passwordError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <p className="text-xs text-rose-400">{passwordError}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button variant="outline" type="button" onClick={() => setIsPasswordModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Guardar Contraseña
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};