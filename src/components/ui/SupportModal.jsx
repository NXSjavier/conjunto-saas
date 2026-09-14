import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { playSuccessChime, playErrorBeep } from '../../lib/sound';
import { Mail, Phone, User, Send, LifeBuoy } from 'lucide-react';

const genId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

export function SupportModal({ isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const role = currentUser?.role;
  const supportTitle = role === 'admin' ? 'Soporte para Administradores' : role === 'resident' || role === 'guard' ? 'Comunicación con Administración' : 'Soporte';
  const supportDesc = role === 'admin' ? 'Envía una queja o consulta al Super Admin de la plataforma' : role === 'resident' || role === 'guard' ? 'Escribe al administrador de tu conjunto' : 'Contacta a la administración de la plataforma';

  useEffect(() => {
    if (!isOpen) return;
    setSent(false);
    setMessage('');
    const load = async () => {
      setLoading(true);
      try {
        const role = currentUser?.role;
        let query = supabase
          .from('profiles')
          .select('id, name, email, phone, role, complex_id')
          .eq('status', 'active');

        if (role === 'admin') {
          // Admin → solo puede contactar a Super Admin
          query = query.eq('role', 'super_admin');
        } else if (role === 'resident' || role === 'guard') {
          // Residente/Guardia → solo el admin de su conjunto
          query = query
            .eq('role', 'admin')
            .eq('complex_id', currentUser?.complex_id || '');
        } else {
          // Super Admin → otros super admins
          query = query.eq('role', 'super_admin').neq('id', currentUser?.id || '');
        }

        const { data } = await query.limit(10);
        const list = data || [];
        list.sort((a, b) => {
          if (a.role === b.role) {
            if (a.complex_id === currentUser?.complex_id) return -1;
            if (b.complex_id === currentUser?.complex_id) return 1;
            return 0;
          }
          return a.role === 'super_admin' ? -1 : 1;
        });
        setAdmins(list);
      } catch {}
      setLoading(false);
    };
    load();
  }, [isOpen, currentUser?.complex_id]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || admins.length === 0) return;
    setSending(true);
    try {
      const notifs = admins.map((a) => {
        const isToSuperAdmin = a.role === 'super_admin';
        const title = isToSuperAdmin
          ? `🆘 Queja/Soporte: ${currentUser?.name || 'Admin'}`
          : `🆘 Comunicación: ${currentUser?.name || 'Usuario'}`;
        const msg = `${message.trim().slice(0, 500)} — ${currentUser?.email || ''} (${role === 'admin' ? 'Administrador' : role === 'resident' ? 'Residente' : role === 'guard' ? 'Guardia' : role})`;
        return {
        id: genId('notif'),
        user_id: a.id,
        title,
        message: msg,
        type: 'support',
        read: 0,
        created_at: new Date().toISOString(),
      };
      });
      const { error } = await supabase.from('notifications').insert(notifs);
      if (error) throw error;
      playSuccessChime();
      setSent(true);
      setMessage('');
    } catch {
      playErrorBeep();
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
       title={supportTitle}
       description={supportDesc}
      maxWidth="md"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-6">
          <LifeBuoy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay contactos de soporte disponibles por ahora.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {admins.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800">
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">
                    {a.name}
                    <span className="ml-2 text-[10px] font-semibold uppercase text-slate-500">
                      {a.role === 'super_admin' ? 'Soporte plataforma' : 'Admin conjunto'}
                    </span>
                  </p>
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    {a.email && (
                      <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300">
                        <Mail className="w-3.5 h-3.5" /> {a.email}
                      </a>
                    )}
                    {a.phone && (
                      <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-300">
                        <Phone className="w-3.5 h-3.5" /> {a.phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sent ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="text-xs font-bold text-emerald-300">✓ Mensaje enviado. Te responderán pronto.</p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Enviar mensaje a soporte
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe tu problema o duda..."
                rows={3}
                maxLength={500}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm p-3 transition-colors focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                required
              />
              <Button type="submit" className="w-full" isLoading={sending} icon={<Send className="w-4 h-4" />}>
                Enviar mensaje
              </Button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
