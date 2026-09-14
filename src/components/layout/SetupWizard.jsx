import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { FlashMessage } from '../ui/FlashMessage';
import { playSuccessChime, playErrorBeep } from '../../lib/sound';
import { Building2, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

export default function SetupWizard({ onDone }) {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState(null);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [complexName, setComplexName] = useState('');
  const [complexAddress, setComplexAddress] = useState('');

  const nextStep = (e) => {
    e.preventDefault();
    setFlash(null);
    if (!adminName.trim() || !adminEmail.trim() || adminPass.length < 8) {
      setFlash({ type: 'error', message: 'Completa nombre, email válido y una contraseña de mínimo 8 caracteres.' });
      return;
    }
    setStep(2);
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    setFlash(null);
    if (!complexName.trim()) {
      setFlash({ type: 'error', message: 'El nombre del conjunto es obligatorio.' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('bootstrap-setup', {
        body: {
          action: 'setup',
          name: adminName.trim(),
          email: adminEmail.trim(),
          password: adminPass,
          complexName: complexName.trim(),
          address: complexAddress.trim(),
        },
      });
      if (error) throw new Error(error.message || 'Error en la configuración');
      if (data?.error) throw new Error(data.error);
      playSuccessChime();
      // Entrar automáticamente con la cuenta creada
      const result = await login(adminEmail.trim(), adminPass);
      if (result.success) {
        onDone();
      } else {
        setFlash({ type: 'success', message: `¡Listo! Tu conjunto (${data?.complexCode || ''}) está creado. Inicia sesión con tu email y contraseña.` });
        setTimeout(() => onDone(), 2500);
      }
    } catch (err) {
      playErrorBeep();
      setFlash({ type: 'error', message: err?.message || 'No se pudo completar la configuración.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Bienvenido a Residex</h1>
          <p className="text-xs text-slate-400 mt-1">Configuración inicial · paso {step} de 2</p>
          <div className="flex gap-1.5 mt-3 max-w-[200px] mx-auto">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          </div>
        </div>

        {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}

        {step === 1 ? (
          <form onSubmit={nextStep} className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Tu cuenta de Super Admin</span>
            </div>
            <Input label="Nombre completo" placeholder="Tu nombre" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            <Input label="Email" type="email" placeholder="tu@email.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
            <Input label="Contraseña" type="password" placeholder="Mínimo 8 caracteres" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} required minLength={8} />
            <Button type="submit" className="w-full" icon={<ArrowRight className="w-4 h-4" />}>
              Continuar
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSetup} className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-300">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Tu primer conjunto</span>
            </div>
            <Input label="Nombre del conjunto" placeholder="Ej: Residencial Los Álamos" value={complexName} onChange={(e) => setComplexName(e.target.value)} required />
            <Input label="Dirección (opcional)" placeholder="Av. Principal #123" value={complexAddress} onChange={(e) => setComplexAddress(e.target.value)} />
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                Se creará con plan <strong>Free</strong> y 30 días de prueba. Podrás cambiar el plan cuando quieras.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="shrink-0" onClick={() => setStep(1)} icon={<ArrowLeft className="w-4 h-4" />}>
                Atrás
              </Button>
              <Button type="submit" className="flex-1" isLoading={loading} icon={<CheckCircle2 className="w-4 h-4" />}>
                Crear mi plataforma
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
