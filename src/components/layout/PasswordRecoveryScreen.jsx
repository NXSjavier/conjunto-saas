import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FlashMessage } from '../ui/FlashMessage';
import { playSuccessChime, playErrorBeep } from '../../lib/sound';
import {
  Building2,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';

export default function PasswordRecoveryScreen({ onBack }) {
  const { resetPassword } = useAuth();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setFlash(null);
    setLoading(true);
    const result = await resetPassword(email, newPass);
    setLoading(false);
    if (result.success) {
      playSuccessChime();
      setFlash({ type: 'success', message: 'Código enviado. Revisa tu correo electrónico.' });
      setStep(2);
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setFlash(null);
    setLoading(true);
    const result = await resetPassword(email, newPass);
    setLoading(false);
    if (result.success) {
      playSuccessChime();
      setFlash({ type: 'success', message: 'Contraseña restablecida correctamente.' });
      setTimeout(() => onBack(), 2000);
    } else {
      playErrorBeep();
      setFlash({ type: 'error', message: result.error });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Recuperar Contraseña</h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1
              ? 'Ingresa tu email para recibir un código'
              : 'Ingresa el código y tu nueva contraseña'}
          </p>
        </div>

        {flash && (
          <FlashMessage
            type={flash.type}
            message={flash.message}
            onClose={() => setFlash(null)}
          />
        )}

        <Card>
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
                minLength={8}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Enviar Código
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label="Código de verificación"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                icon={<KeyRound className="w-4 h-4" />}
                required
              />
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="Repite tu nueva contraseña"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
                minLength={8}
              />
              <Button
                type="submit"
                className="w-full"
                isLoading={loading}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Restablecer Contraseña
              </Button>
            </form>
          )}
        </Card>

        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </button>
        </div>
      </div>
    </div>
  );
}
