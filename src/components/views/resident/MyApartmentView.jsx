import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Home, User, Mail, Phone } from 'lucide-react';

export const MyApartmentView = () => {
  const { currentUser, currentComplex } = useAuth();
  const { apartments } = useData();

  const myApt = apartments.find((a) => a.resident_id === currentUser?.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Mi Apartamento" subtitle="Información detallada de tu unidad habitacional" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Datos del Apartamento" subtitle="Información de la unidad">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Home className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Número</p>
                <p className="text-sm font-semibold text-slate-100">{myApt?.number || 'Sin asignar'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Home className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Piso</p>
                <p className="text-sm font-semibold text-slate-100">{myApt?.floor || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Home className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Estado</p>
                <p className="text-sm font-semibold text-slate-100">{myApt?.status || '-'}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Datos del Residente" subtitle="Tu información personal">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <User className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Nombre</p>
                <p className="text-sm font-semibold text-slate-100">{currentUser?.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Mail className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="text-sm font-semibold text-slate-100">{currentUser?.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Phone className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Teléfono</p>
                <p className="text-sm font-semibold text-slate-100">{currentUser?.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <Home className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs text-slate-400">Conjunto</p>
                <p className="text-sm font-semibold text-slate-100">{currentComplex?.name || '-'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
