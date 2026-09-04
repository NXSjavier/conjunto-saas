import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Modal } from '../../ui/Modal';
import { EmptyState } from '../../ui/EmptyState';
import { AnnouncementComments } from '../../ui/AnnouncementComments';
import { Megaphone, Plus, Trash2, Calendar } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const AnnouncementsView = () => {
  const { announcements, comments, createAnnouncement, deleteAnnouncement, addComment, deleteComment } = useData();
  const { currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    await createAnnouncement(title.trim(), content.trim());
    setTitle('');
    setContent('');
    setSubmitting(false);
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este comunicado? Se borrarán también todos sus comentarios.')) {
      await deleteAnnouncement(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        subtitle="Publica avisos oficiales y gestiona la interacción en tiempo real con los residentes."
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsModalOpen(true)}>
            Nuevo Comunicado
          </Button>
        }
      />

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-8 h-8" />}
          title="No hay comunicados publicados"
          description="Crea el primer comunicado para notificar a todos los residentes del conjunto."
          action={<Button onClick={() => setIsModalOpen(true)}>Crear Comunicado</Button>}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const announcementComments = comments.filter((c) => c.announcement_id === a.id);
            return (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-100">{a.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span className="font-medium text-slate-300">{a.author_name}</span>
                      <span>·</span>
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(a.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">{a.content}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDelete(a.id)}
                  />
                </div>

                <AnnouncementComments
                  announcementId={a.id}
                  comments={comments}
                  onAddComment={(content) => addComment(a.id, content)}
                  onDeleteComment={deleteComment}
                />
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Comunicado Oficial"
        description="El comunicado será visible para todos los residentes activos del conjunto."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Título del comunicado"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Mantenimiento programado del ascensor"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Contenido
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe los detalles del comunicado para los residentes..."
              rows={4}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm placeholder-slate-500 py-2.5 px-3.5 transition-colors duration-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={submitting}>
              Publicar Comunicado
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
