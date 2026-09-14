import React from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { PageHeader } from '../../ui/PageHeader';
import { EmptyState } from '../../ui/EmptyState';
import { Bell, Check, BellDot, Trash2, ChevronRight } from 'lucide-react';
import { formatDate } from '../../../lib/utils';

const TYPE_ICONS = {
  visitor: '🚪',
  announcement: '📢',
  comment: '💬',
  incident: '🚨',
  reservation: '📅',
  default: '🔔',
};

const TYPE_COLORS = {
  visitor: 'indigo',
  announcement: 'sky',
  comment: 'amber',
  incident: 'rose',
  reservation: 'purple',
  default: 'slate',
};

export const NotificationsView = () => {
  const { notifications, markAllNotificationsAsRead, clearNotifications } = useData();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeLabel = (type) => {
    const labels = {
      visitor: 'Visita',
      announcement: 'Comunicado',
      comment: 'Comentario',
      incident: 'Incidencia',
      reservation: 'Reserva',
      default: 'Notificación',
    };
    return labels[type] || labels.default;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        subtitle="Historial de alertas, comunicados y actualizaciones de tu conjunto."
        badge={<Badge variant="slate" size="sm">{notifications.length} notificaciones</Badge>}
        action={
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="secondary"
                icon={<Check className="w-4 h-4" />}
                onClick={markAllNotificationsAsRead}
              >
                Marcas todas leídas
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={clearNotifications}
              >
                Limpiar todo
              </Button>
            )}
          </div>
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellDot className="w-8 h-8" />}
          title="No tienes notificaciones"
          description="Cuando lleguen nuevas notificaciones, aparecerán aquí."
        />
      ) : (
        <Card>
          {/* Desktop: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-800/80">
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Mensaje</th>
                  <th className="text-left py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-center py-3 px-5 font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-5">
                      <span className="text-lg">{TYPE_ICONS[n.type] || TYPE_ICONS.default}</span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="space-y-0.5">
                        <p className={`font-medium ${!n.read ? 'text-slate-100' : 'text-slate-300'}`}>
                          {n.title || typeLabel(n.type)}
                        </p>
                        <p className="text-xs text-slate-500">{n.message}</p>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-slate-500">{formatDate(n.created_at)}</td>
                    <td className="py-3 px-5 text-center">
                      <Badge variant={n.read ? 'slate' : 'emerald'} size="sm">
                        {n.read ? 'Leída' : 'Nueva'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-colors ${
                  !n.read
                    ? 'bg-slate-950/80 border-emerald-500/30'
                    : 'bg-slate-950/40 border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0 mt-0.5">
                    {TYPE_ICONS[n.type] || TYPE_ICONS.default}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-semibold ${!n.read ? 'text-slate-100' : 'text-slate-300'}`}>
                        {n.title || typeLabel(n.type)}
                      </p>
                      {!n.read && (
                        <Badge variant="emerald" size="sm">Nueva</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {unreadCount > 0 && (
            <div className="p-3 border-t border-slate-800 flex justify-center">
              <Button size="sm" variant="outline" onClick={markAllNotificationsAsRead}>
                <Check className="w-4 h-4 mr-1.5" />
                Marcar todas como leídas ({unreadCount})
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
