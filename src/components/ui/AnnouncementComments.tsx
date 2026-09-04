import React, { useState } from 'react';
import { Send, Trash2, MessageSquare, User as UserIcon } from 'lucide-react';
import { AnnouncementComment, User } from '../../types';
import { formatDate } from '../../lib/utils';
import { soundEngine } from '../../lib/sound';

export interface AnnouncementCommentsProps {
  announcementId: number;
  comments: AnnouncementComment[];
  currentUser: User | null;
  onAddComment: (announcementId: number, body: string) => void;
  onDeleteComment: (commentId: number) => void;
}

export const AnnouncementComments: React.FC<AnnouncementCommentsProps> = ({
  announcementId,
  comments,
  currentUser,
  onAddComment,
  onDeleteComment,
}) => {
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredComments = comments.filter((c) => c.announcement_id === announcementId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    onAddComment(announcementId, commentText.trim());
    setCommentText('');
    setIsSubmitting(false);
    soundEngine.playSuccessChime();
  };

  const canDelete = (comment: AnnouncementComment) => {
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.id === comment.user_id;
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="h-4 w-4 text-emerald-600" />
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Comentarios en tiempo real ({filteredComments.length})
        </h4>
      </div>

      {/* Comments List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {filteredComments.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">Sé el primero en dejar un comentario o consulta...</p>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 text-xs group transition-colors hover:bg-slate-100/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                    <UserIcon className="h-3 w-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900">{comment.author_name}</span>
                    {comment.author_role && (
                      <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({comment.author_role})</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">{formatDate(comment.created_at)}</span>
                  {canDelete(comment) && (
                    <button
                      onClick={() => onDeleteComment(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5 rounded cursor-pointer"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-slate-700 mt-1.5 leading-relaxed pl-8">{comment.body}</p>
            </div>
          ))
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Escribe un comentario o pregunta..."
          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all"
        />
        <button
          type="submit"
          disabled={!commentText.trim() || isSubmitting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        >
          <Send className="h-3 w-3" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};
