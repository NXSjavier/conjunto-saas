import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { soundEngine } from './sound';

class CapacitorNotificationService {
  private isCapacitor = Capacitor.isNativePlatform();
  private isAppInBackground = false;
  private permissionGranted = false;

  constructor() {
    this.initLifecycle();
  }

  /**
   * Monitor whether app is in background or foreground
   */
  private initLifecycle() {
    if (this.isCapacitor) {
      CapApp.addListener('appStateChange', (state) => {
        this.isAppInBackground = !state.isActive;
      });
    } else if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isAppInBackground = document.hidden;
      });
    }
  }

  /**
   * Request full notification permissions (Push + Local Notifications)
   * Essential for background operation in Android 13+ (POST_NOTIFICATIONS) and iOS.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (this.isCapacitor) {
        // 1. Request Local Notifications Permission
        const localPerm = await LocalNotifications.requestPermissions();
        
        // 2. Request Push Notifications Permission
        let pushPerm = { receive: 'denied' };
        try {
          pushPerm = await PushNotifications.requestPermissions();
          if (pushPerm.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.log('Push register not available or emulator:', e);
        }

        // 3. Create Android Notification Channel for High Priority / Background alerts
        await this.createAndroidChannels();

        this.permissionGranted = localPerm.display === 'granted' || pushPerm.receive === 'granted';
        return this.permissionGranted;
      } else {
        // Web / PWA Notification API
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            this.permissionGranted = true;
            return true;
          }
          if (Notification.permission !== 'denied') {
            const res = await Notification.requestPermission();
            this.permissionGranted = res === 'granted';
            return this.permissionGranted;
          }
        }
        return false;
      }
    } catch (err) {
      console.warn('Error requesting notification permissions:', err);
      return false;
    }
  }

  /**
   * Create Android high-priority channel with vibration & sound for background display
   */
  private async createAndroidChannels() {
    if (!this.isCapacitor || Capacitor.getPlatform() !== 'android') return;

    try {
      await LocalNotifications.createChannel({
        id: 'conjuntos_urgent_alerts',
        name: 'Alertas y Garita en Tiempo Real',
        description: 'Notificaciones urgentes de pases de visita, garita, seguridad e incidencias',
        importance: 5, // High importance (heads-up / banner display)
        visibility: 1, // Public on lockscreen
        vibration: true,
        lights: true,
        lightColor: '#7C3AED',
      });
    } catch (err) {
      console.warn('Could not create notification channel:', err);
    }
  }

  /**
   * Dispatches a notification to the device (handles background and foreground)
   */
  public async sendNotification(options: {
    title: string;
    body: string;
    id?: number;
    extra?: any;
    soundType?: 'beep' | 'success' | 'error';
  }) {
    const { title, body, id = Math.floor(Math.random() * 100000), extra, soundType = 'beep' } = options;

    // Trigger haptic vibration & sound
    if (this.isCapacitor) {
      try {
        if (soundType === 'error') {
          await Haptics.notification({ type: NotificationType.Error });
        } else if (soundType === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        }
      } catch {
        // Haptics fallback
      }
    }

    // Play synthesized sound
    if (soundType === 'success') {
      soundEngine.playSuccessChime();
    } else if (soundType === 'error') {
      soundEngine.playErrorBeep();
    } else {
      soundEngine.playNotificationBeep();
    }

    // Send native system notification (shows on status bar / lockscreen even in background)
    if (this.isCapacitor) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id,
              schedule: { at: new Date(Date.now() + 100) },
              channelId: 'conjuntos_urgent_alerts',
              extra: extra || {},
              sound: undefined,
              actionTypeId: '',
              attachments: undefined,
            },
          ],
        });
      } catch (err) {
        console.warn('Failed to schedule Capacitor local notification:', err);
      }
    } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: String(id),
        });
      } catch (err) {
        console.warn('Web notification error:', err);
      }
    }
  }

  public getIsInBackground() {
    return this.isAppInBackground;
  }
}

export const capNotificationService = new CapacitorNotificationService();
