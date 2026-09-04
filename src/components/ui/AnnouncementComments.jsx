import React, { useState } from 'react';
import { Send, Trash2, MessageSquare } from 'lucide-react';

import { formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { Button } from './Button';

export const AnnouncementComments = ({
  announcementId,
  comments,
  onAddComment,
  onDeleteComment,
}) => {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    await onAddComment(content.trim());
    setContent('');
    setIsSubmitting(false);
  };

  const itemComments = comments.filter((c) => c.announcement_id === announcementId);

  return (
    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
        <span>Comentarios en vivo ({itemComments.length})</span>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {itemComments.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">Sé el primero en comentar este comunicado...</p>
        ) : (
          itemComments.map((c) => {
            const isAuthor = currentUser?.id === c.author_id || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
            return (
              <div
                key={c.id}
                className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{c.author_name}</span>
                    <span className="text-[10px] text-slate-500">{formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-slate-300 text-xs">{c.content}</p>
                </div>
                {isAuthor && (
                  <button
                    onClick={() => onDeleteComment(c.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity rounded"
                    title="Eliminar comentario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un comentario..."
          className="flex-1 text-xs rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <Button size="sm" type="submit" disabled={!content.trim()} isLoading={isSubmitting} icon={<Send className="w-3.5 h-3.5" />}>
          Enviar
        </Button>
      </form>
    </div>
  );
};
