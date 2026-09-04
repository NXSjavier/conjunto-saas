import React from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Badge } from '../../ui/Badge';
import { AnnouncementComments } from '../../ui/AnnouncementComments';
import { Megaphone } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

export const ResidentAnnouncementsView = () => {
  const { announcements, comments, addComment, deleteComment } = useData();

  return (
    <div className="space-y-6">
      <PageHeader title="Comunicados" subtitle="Avisos de la administración con comentarios en tiempo real" />
      {announcements.length === 0 ? (
        <Card><p className="text-xs text-slate-500 text-center py-6">No hay comunicados publicados aún.</p></Card>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <Card key={a.id}>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-100">{a.title}</h3>
                  <span className="text-[10px] text-slate-500">{formatDate(a.created_at)}</span>
                </div>
                <p className="text-sm text-slate-300">{a.content}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="sky" size="sm">{a.author_name || 'Administración'}</Badge>
                </div>
              </div>
              <AnnouncementComments announcementId={a.id} comments={comments} onAddComment={(content) => addComment(a.id, content)} onDeleteComment={deleteComment} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
