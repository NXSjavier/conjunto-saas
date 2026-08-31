import React, { useState } from 'react';
import { Megaphone, Plus, Trash2, Image, MessageSquare, Clock, User, Send, Paperclip } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Badge } from '../../ui/Badge';
import { AnnouncementComments } from '../../ui/AnnouncementComments';
import { EmptyState } from '../../ui/EmptyState';
import { formatDate } from '../../../lib/utils';
import { Announcement } from '../../../types';

export const AnnouncementsView: React.FC = () => {
  const { currentComplex, currentUser } = useAuth();
  const {
    announcements,
    comments,
    createAnnouncement,
    deleteAnnouncement,
    addComment,
    deleteComment,
  } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [activeCommentsAnnouncementId, setActiveCommentsAnnouncementId] = useState<number | null>(null);

  const complexId = currentComplex?.id || 1;
  const complexAnnouncements = announcements.filter((a) => a.residential_complex_id === complexId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    createAnnouncement(
      title,
      body,
      attachmentUrl.trim() ? [attachmentUrl.trim()] : undefined
    );

    setTitle('');
    setBody('');
    setAttachmentUrl('');
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de eliminar este comunicado?')) {
      deleteAnnouncement(id);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados y Avisos"
        subtitle={`Publicaciones oficiales y circulares para ${currentComplex?.name || 'el conjunto'}`}
        badge={<Badge variant="purple">{complexAnnouncements.length} publicados</Badge>}
        actions={
          currentUser?.role === 'admin' || currentUser?.role === 'super_admin' ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              icon={<Plus className="h-4 w-4" />}
            >
              Nuevo Comunicado
            </Button>
          ) : undefined
        }
      />

      {complexAnnouncements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-7 w-7 text-purple-600" />}
          title="No hay comunicados publicados"
          description="Publica información relevante sobre mantenimiento, asambleas, normas de convivencia o emergencias."
          actionLabel={currentUser?.role === 'admin' ? 'Publicar Primer Comunicado' : undefined}
          onAction={currentUser?.role === 'admin' ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-4">
          {complexAnnouncements.map((announcement) => {
            const annComments = comments.filter((c) => c.announcement_id === announcement.id);
            const isCommentsOpen = activeCommentsAnnouncementId === announcement.id;

            return (
              <Card key={announcement.id} className="overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <h3 className="text-base font-bold text-slate-900 tracking-tight">
                        {announcement.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {announcement.author_name} ({announcement.author_role || 'Admin'})
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(announcement.created_at)}
                      </span>
                    </div>
                  </div>

                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Eliminar comunicado"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Body Content */}
                <p className="text-xs text-slate-700 mt-3 leading-relaxed whitespace-pre-line">
                  {announcement.body}
                </p>

                {/* Attachments if any */}
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {announcement.attachments.map((url, idx) => (
                      <div key={idx} className="rounded-2xl overflow-hidden border border-slate-200 shadow-xs max-h-56">
                        <img src={url} alt="Adjunto" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments Toggle Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() =>
                      setActiveCommentsAnnouncementId(isCommentsOpen ? null : announcement.id)
                    }
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{annComments.length} Comentarios</span>
                  </button>

                  <span className="text-[11px] text-slate-400">
                    Notificado a todos los residentes
                  </span>
                </div>

                {/* Realtime Comments Section */}
                {isCommentsOpen && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50/70 p-4 rounded-2xl">
                    <AnnouncementComments
                      announcementId={announcement.id}
                      comments={annComments}
                      currentUserId={currentUser?.id || ''}
                      onAddComment={(bodyText) => addComment(announcement.id, bodyText)}
                      onDeleteComment={deleteComment}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Create Announcement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publicar Nuevo Comunicado"
        subtitle="Se enviará una notificación push a todos los residentes"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Título del Comunicado"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Mantenimiento Programado de Ascensores"
            icon={<Megaphone className="h-4 w-4" />}
            required
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contenido del Comunicado
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Detalla los horarios, recomendaciones y teléfonos de contacto..."
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              required
            />
          </div>

          <Input
            label="URL de Imagen o Adjunto (Opcional)"
            value={attachmentUrl}
            onChange={(e) => setAttachmentUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            icon={<Paperclip className="h-4 w-4" />}
            helperText="Puedes pegar un link directo a una imagen representativa."
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Publicar Comunicado
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
