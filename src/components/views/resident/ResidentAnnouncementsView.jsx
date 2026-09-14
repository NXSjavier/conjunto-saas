import React, { useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../ui/Card';
import { PageHeader } from '../../ui/PageHeader';
import { Badge } from '../../ui/Badge';
import { AnnouncementComments } from '../../ui/AnnouncementComments';
import { Megaphone, WifiOff } from 'lucide-react';
import { formatDate } from '../../../lib/utils';
import { clearCachedAnnouncements, getCachedAnnouncements, useOnlineStatus } from '../../../lib/offlineCache';

export const ResidentAnnouncementsView = () => {
  const { announcements, comments, addComment, deleteComment, isLoading } = useData();
  const { currentUser } = useAuth();
  const online = useOnlineStatus();

  // Caché obsoleta: con internet y carga terminada vacía, lo guardado ya no existe
  useEffect(() => {
    if (online && !isLoading && announcements.length === 0) {
      clearCachedAnnouncements(currentUser?.complex_id);
    }
  }, [online, isLoading, announcements.length, currentUser?.complex_id]);

  // Fallback offline: últimos comunicados guardados (SOLO sin internet real)
  const cached = !online && announcements.length === 0
    ? getCachedAnnouncements(currentUser?.complex_id)
    : null;
  const list = announcements.length > 0 ? announcements : (cached?.items || []);
  const showingCached = !online && announcements.length === 0 && list.length > 0;
  const loading = isLoading && list.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Comunicados" subtitle="Avisos de la administración con comentarios en tiempo real" />
      {showingCached && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-200/90">
            Sin conexión. Mostrando últimos comunicados guardados
            {cached?.savedAt ? ` (${formatDate(cached.savedAt)})` : ''}. Los comentarios requieren internet.
          </p>
        </div>
      )}
      {loading ? (
        <Card><p className="text-xs text-slate-500 text-center py-6">Cargando comunicados…</p></Card>
      ) : list.length === 0 ? (
        <Card><p className="text-xs text-slate-500 text-center py-6">No hay comunicados publicados aún.</p></Card>
      ) : (
        <div className="space-y-4">
          {list.map(a => (
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
              {online && !showingCached && (
                <AnnouncementComments announcementId={a.id} comments={comments} onAddComment={(content) => addComment(a.id, content)} onDeleteComment={deleteComment} />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
