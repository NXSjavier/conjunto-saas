import { getWsBaseUrl, isStandalone } from './config';

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
    this.isConnecting = false;
    this.isConnected = false;
    this.statusListeners = new Set();
    // En móvil standalone no usamos WebSocket local; usa Supabase Realtime
    if (!isStandalone()) this.connect();
    else {
      // No intenta conectar, evita spam de reconexión en móvil sin servidor
      this.isConnected = false;
    }
  }

  connect() {
    if (isStandalone()) return;
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.isConnecting = true;
    const base = getWsBaseUrl();
    const wsUrl = base.endsWith('/ws') ? base : `${base.replace(/\/$/, '')}/ws`;
    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => { this.isConnecting = false; this.isConnected = true; this.notifyStatus(true); this.send({ type: 'PING' }); };
      this.ws.onmessage = (event) => { try { const data = JSON.parse(event.data); this.listeners.forEach((l) => l(data)); } catch (e) { console.error('Failed to parse WS message:', e); } };
      this.ws.onclose = () => { this.isConnected = false; this.isConnecting = false; this.notifyStatus(false); this.scheduleReconnect(); };
      this.ws.onerror = () => { this.isConnected = false; this.notifyStatus(false); };
    } catch (err) { this.isConnecting = false; this.isConnected = false; this.notifyStatus(false); this.scheduleReconnect(); }
  }

  scheduleReconnect() {
    if (isStandalone()) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
  notifyStatus(connected) { this.statusListeners.forEach((fn) => fn(connected)); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  subscribeStatus(listener) { this.statusListeners.add(listener); listener(this.isConnected); return () => this.statusListeners.delete(listener); }
  send(payload) { if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(payload)); }
  getConnected() { return this.isConnected; }
}

export const wsClient = new WebSocketClient();
