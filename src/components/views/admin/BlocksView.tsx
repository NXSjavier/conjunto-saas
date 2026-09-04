import React, { useState } from 'react';
import { Building, Plus, Trash2, Home, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { FlashMessage } from '../../ui/FlashMessage';

export const BlocksView: React.FC = () => {
  const { currentComplex } = useAuth();
  const { blocks, apartments, createBlock, deleteBlock } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');
  const [flash, setFlash] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const complexId = currentComplex?.id || 1;
  const complexBlocks = blocks.filter((b) => b.residential_complex_id === complexId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockName.trim()) {
      setFlash({ message: 'Ingresa el nombre de la torre o bloque', type: 'error' });
      return;
    }

    const res = createBlock(blockName, blockDescription);
    if (res.success) {
      setFlash({ message: `Torre / Bloque "${blockName}" creado exitosamente`, type: 'success' });
      setBlockName('');
      setBlockDescription('');
      setIsModalOpen(false);
    } else {
      setFlash({ message: res.message || 'Error al crear bloque', type: 'error' });
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el bloque "${name}"?`)) {
      deleteBlock(id);
      setFlash({ message: `Bloque "${name}" eliminado`, type: 'info' });
    }
  };

  return (
    <div className="space-y-6">
      <FlashMessage
        message={flash?.message || null}
        type={flash?.type || 'success'}
        onClose={() => setFlash(null)}
      />

      <PageHeader
        title="Torres y Bloques"
        subtitle={`Organización estructural de edificios y manzanas en ${currentComplex?.name || 'el conjunto'}`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
            Nueva Torre / Bloque
          </Button>
        }
      />

      {complexBlocks.length === 0 ? (
        <EmptyState
          icon={<Building className="h-7 w-7 text-emerald-600" />}
          title="No hay torres o bloques registrados"
          description="Crea torres, edificios o manzanas para agrupar tus departamentos de forma ordenada."
          actionLabel="Crear Primer Bloque"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {complexBlocks.map((block) => {
            const aptCount = apartments.filter(
              (a) => a.residential_complex_id === complexId && a.apartment_block_id === block.id
            ).length;

            return (
              <Card key={block.id} className="relative group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{block.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{aptCount} departamento(s) vinculados</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(block.id, block.name)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                    title="Eliminar bloque"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {block.description && (
                  <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                    {block.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Block Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Torre / Manzana"
        subtitle="Agrega un bloque estructural para asignar departamentos"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Nombre de la Torre o Manzana"
            value={blockName}
            onChange={(e) => setBlockName(e.target.value)}
            placeholder="Ej: Torre C o Manzana 4"
            icon={<Building className="h-4 w-4" />}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Descripción o Características (Opcional)
            </label>
            <textarea
              value={blockDescription}
              onChange={(e) => setBlockDescription(e.target.value)}
              placeholder="Ej: Edificio de 10 pisos con vista a las áreas verdes..."
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Guardar Torre / Bloque
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
