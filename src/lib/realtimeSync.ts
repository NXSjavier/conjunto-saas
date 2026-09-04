import { Announcement, AnnouncementComment, Incident, Reservation, ReservationStatus, ResidentialComplex, User, Visitor, VisitorStatus } from '../types';

export type RealtimeEventType =
  | 'ANNOUNCEMENT_NEW'
  | 'ANNOUNCEMENT_DELETE'
  | 'COMMENT_NEW'
  | 'COMMENT_DELETE'
  | 'VISITOR_NEW'
  | 'VISITOR_UPDATE'
  | 'RESERVATION_NEW'
  | 'RESERVATION_UPDATE'
  | 'INCIDENT_NEW'
  | 'INCIDENT_UPDATE'
  | 'USER_NEW_PENDING'
  | 'USER_APPROVED'
  | 'USER_REJECTED'
  | 'USER_PURGED'
  | 'COMPLEX_UPDATE'
  | 'AUTH_SESSION_UPDATE';

export interface RealtimeMessage {
  id: string;
  type: RealtimeEventType;
  payload: any;
  senderTabId: string;
  timestamp: number;
}

type RealtimeListener = (message: RealtimeMessage) => void;

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private tabId: string = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  private channelName = 'conjuntos_realtime_bus';
  private storageKey = 'conjuntos_realtime_event_signal';

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // 1. BroadcastChannel for instant cross-tab / cross-window sync
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event: MessageEvent<RealtimeMessage>) => {
          if (event.data && event.data.senderTabId !== this.tabId) {
            this.notifyListeners(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel initialization error:', e);
      }
    }

    // 2. Storage event listener fallback (also works across iframes / windows)
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key === this.storageKey && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue) as RealtimeMessage;
          if (msg && msg.senderTabId !== this.tabId) {
            this.notifyListeners(msg);
          }
        } catch (err) {
          // ignore parsing error
        }
      }
    });
  }

  private notifyListeners(message: RealtimeMessage) {
    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in realtime listener:', err);
      }
    });
  }

  public broadcast(type: RealtimeEventType, payload: any) {
    const message: RealtimeMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      senderTabId: this.tabId,
      timestamp: Date.now(),
    };

    // 1. Broadcast via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('Broadcast error:', e);
      }
    }

    // 2. Broadcast via localStorage trigger
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(message));
      } catch (e) {
        // quota exceeded or private mode
      }
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTabId(): string {
    return this.tabId;
  }
}

export const realtimeBus = new RealtimeSyncBus();
