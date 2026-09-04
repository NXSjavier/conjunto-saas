import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Clock } from 'lucide-react';
import { NotificationItem } from '../../types';
import { soundEngine } from '../../lib/sound';
import { formatDate } from '../../lib/utils';
import { capNotificationService } from '../../lib/capacitorNotifications';

export interface NotificationBellProps {
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onClearNotifications?: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  onNotificationClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!isOpen && unreadCount > 0) {
      soundEngine.playNotificationBeep(880, 0.2);
    }
    setIsOpen(!isOpen);
  };

  const handleMarkRead = () => {
    onMarkAllAsRead();
    soundEngine.playSuccessChime();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-button"
        onClick={handleToggle}
        className="relative h-9 w-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notifications-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-[26rem] bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} nuevas
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkRead}
                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Leídas</span>
                </button>
              )}
              {onClearNotifications && notifications.length > 0 && (
                <button
                  onClick={onClearNotifications}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                  title="Limpiar"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {/* Background notification testing trigger */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-600 font-medium">Alertas en 2do Plano / Garita</span>
              <button
                onClick={async () => {
                  const granted = await capNotificationService.requestPermissions();
                  if (granted) {
                    await capNotificationService.sendNotification({
                      title: '🔔 Alerta de Garita (Segundo Plano)',
                      body: 'Capacitor: Las notificaciones y vibración en segundo plano están activas.',
                      soundType: 'success',
                    });
                  }
                }}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Probar / Activar
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No tienes notificaciones</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Te avisaremos sobre visitas, reservas y anuncios</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onNotificationClick) onNotificationClick(item);
                  }}
                  className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 items-start ${
                    !item.read ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      !item.read ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-transparent'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed line-clamp-2">{item.message}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
