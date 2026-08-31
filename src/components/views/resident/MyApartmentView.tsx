import React, { useState } from 'react';
import { Home, Users, Building, ShieldCheck, Phone, Mail, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';

export const MyApartmentView: React.FC = () => {
  const { currentUser, currentComplex } = useAuth();
  const { apartments, blocks } = useData();

  const myApt = apartments.find(
    (a) =>
      a.residential_complex_id === currentComplex?.id &&
      (a.resident_id === currentUser?.id || a.number === currentUser?.apartment_number)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi Departamento y Convivencia"
        subtitle={`Ficha habitacional y datos de tu unidad en ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="sky">{currentUser?.apartment_number || 'Apto 101'}</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Apartment Details Card */}
        <div className="md:col-span-2 space-y-4">
          <Card title="Detalles de la Unidad">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Número de Unidad:</span>
                <span className="text-sm font-bold text-slate-900">{currentUser?.apartment_number || '101'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Torre / Edificio:</span>
                <span className="text-sm font-bold text-slate-900">{myApt?.block_name || 'Torre General'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Piso:</span>
                <span className="text-sm font-bold text-slate-900">{myApt?.floor || 'Piso 1'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Estado del Inmueble:</span>
                <span className="text-sm font-bold text-emerald-700">Ocupado (Habitado)</span>
              </div>
            </div>
          </Card>

          <Card title="Copropietarios y Habitantes Registrados">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <img
                src={
                  currentUser?.face_photo_path ||
                  currentUser?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
                }
                alt={currentUser?.name}
                className="h-10 w-10 rounded-xl object-cover border border-slate-300"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser?.name}</h4>
                <p className="text-[11px] text-slate-500">{currentUser?.email} • Titular Principal</p>
              </div>
              <Badge variant="emerald">Titular</Badge>
            </div>
          </Card>
        </div>

        {/* Complex and Emergency Contacts */}
        <div className="space-y-4">
          <Card title="Contactos de Emergencia">
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">Garita Principal / Vigilancia</span>
                <span className="text-slate-600 font-mono text-[11px]">+57 (4) 444-1234 (Ext. 100)</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block">Administración Central</span>
                <span className="text-slate-600 text-[11px]">admin@conjuntos.app</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                <span className="font-bold block">Policía Nacional / Cuadrante</span>
                <span className="font-mono text-xs font-bold">123 / Cuadrante 4</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
