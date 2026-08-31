import React, { useState } from 'react';
import {
  Code2,
  Copy,
  CheckCircle2,
  Download,
  FolderTree,
  Terminal,
  Smartphone,
  Database,
  Bell,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { copyToClipboard } from '../../../lib/utils';
import { soundEngine } from '../../../lib/sound';

export const ExpoCodeExportView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'structure' | 'app_json' | 'supabase_sql' | 'supabase_ts' | 'notifications_ts' | 'layout_tsx' | 'package_json'
  >('structure');
  const [copied, setCopied] = useState(false);

  const fileTree = `
conjuntos-app-mobile/
├── app/
│   ├── _layout.tsx                     # Root Expo Router Layout with Auth & Drawer Guard
│   ├── index.tsx                       # Redirects based on user session role
│   ├── (auth)/
│   │   ├── _layout.tsx                 # Auth Stack Layout
│   │   ├── login.tsx                   # Email/Password Login + Quick Demo selector
│   │   ├── register-code.tsx           # Register with complex code (LP-YYYY-XXXX)
│   │   └── register-no-code.tsx        # Search complex + Expo ImagePicker face photo
│   ├── (super)/
│   │   ├── _layout.tsx                 # Super Admin Drawer Navigation
│   │   ├── dashboard.tsx               # Global KPI cards & complexes
│   │   └── subscriptions.tsx           # SaaS Plans, payments, receipt generation
│   ├── (admin)/
│   │   ├── _layout.tsx                 # Admin Drawer Navigation
│   │   ├── dashboard.tsx               # 6 StatCards + 14 QuickActions + Apartments
│   │   ├── pending.tsx                 # Pending residents with zoomable face photo
│   │   ├── apartments.tsx              # Towers & Apartments CRUD with plan limits
│   │   ├── announcements.tsx           # Announcements + Realtime Comments
│   │   ├── incidents.tsx               # Incidents workflow (open -> in_progress -> resolved)
│   │   └── visitors.tsx                # Visitors Log table with status filters
│   ├── (resident)/
│   │   ├── _layout.tsx                 # Resident Drawer / Bottom Tabs
│   │   ├── index.tsx                   # Resident Home Dashboard
│   │   ├── visitors.tsx                # Generates XXXX-XXXX code with copy button
│   │   ├── reservations.tsx            # Common area bookings (Quincho, Salón, etc.)
│   │   └── incidents.tsx               # Report issues with photo attachments
│   └── (guard)/
│       ├── _layout.tsx                 # Guard Puesto de Control
│       ├── dashboard.tsx               # Passes for current shift
│       ├── validator.tsx               # 880Hz audio verification + IN/OUT buttons
│       └── directory.tsx               # Instant resident phone directory
├── src/
│   ├── components/                     # NativeWind / React Native UI components
│   ├── context/
│   │   ├── AuthContext.tsx             # Supabase Auth + SecureStore token persistence
│   │   └── DataContext.tsx             # Realtime postgres_changes listeners
│   └── lib/
│       ├── supabase.ts                 # Supabase client with expo-secure-store
│       ├── notifications.ts            # Firebase Cloud Messaging + Expo Notifications
│       ├── sound.ts                    # 880Hz Beep generator (expo-audio / WebAudio)
│       └── pdf.ts                      # JSPDF receipt generator
├── supabase/
│   └── migrations/
│       └── 01_initial_schema.sql       # Tables, RLS, Foreign Keys, Realtime triggers
├── app.json                            # Expo SDK 54 config (Android package, FCM)
├── tailwind.config.js                  # NativeWind v4 Tailwind configuration
└── package.json                        # Expo SDK 54 (Client v54.0.8), NativeWind, Supabase
`;

  const codeSnippets: Record<string, string> = {
    app_json: `{
  "expo": {
    "name": "Conjuntos App",
    "slug": "conjuntos-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#020617"
    },
    "ios": {
      "supportsTablet": false
    },
    "android": {
      "package": "com.conjuntos.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#020617"
      },
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-image-picker",
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#10B981",
          "sounds": ["./assets/sounds/beep_880hz.wav"]
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}`,

    supabase_sql: `-- MIGRACIÓN SUPABASE: CONJUNTOS APP (POSTGRESQL + RLS + REALTIME)

-- 1. TABLA: CONJUNTOS RESIDENCIALES
CREATE TABLE public.residential_complexes (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  address VARCHAR(255),
  city VARCHAR(100),
  phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'trial' CHECK (subscription_status IN ('active', 'trial', 'blocked')),
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  subscription_notes TEXT,
  payment_receipt_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: USUARIOS Y PERFILES
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'resident', 'guard')),
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE SET NULL,
  requested_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE SET NULL,
  apartment_number VARCHAR(50),
  requested_block_or_apt VARCHAR(100),
  face_photo_path TEXT,
  phone VARCHAR(50),
  fcm_token TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: TORRES Y BLOQUES
CREATE TABLE public.apartment_blocks (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: DEPARTAMENTOS / UNIDADES
CREATE TABLE public.apartments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  apartment_block_id BIGINT REFERENCES public.apartment_blocks(id) ON DELETE SET NULL,
  number VARCHAR(50) NOT NULL,
  floor VARCHAR(20),
  resident_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: VISITANTES Y PASES
CREATE TABLE public.visitors (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  document_number VARCHAR(50),
  phone VARCHAR(50),
  visiting_name VARCHAR(255) NOT NULL,
  apartment_number VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'in', 'out', 'rejected')),
  approved BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  requested_by UUID REFERENCES public.profiles(id) NOT NULL,
  check_in_at TIMESTAMPTZ,
  check_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: COMUNICADOS Y COMENTARIOS REALTIME
CREATE TABLE public.announcements (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  published_by UUID REFERENCES public.profiles(id) NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.announcement_comments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  announcement_id BIGINT REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR PUBLICACIÓN REALTIME PARA COMENTARIOS, PASES Y NOTIFICACIONES
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
`,

    supabase_ts: `// src/lib/supabase.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kptuyksmdomgqntsdzsu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwdHV5a3NtZG9tZ3FudHNkenN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTg4ODQsImV4cCI6MjEwMzM3NDg4NH0.hGMnZHjG_IHJyCvgE67vPUGRV6WU7Nh2jfsTUcgkUcU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? AsyncStorage : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
`,

    notifications_ts: `// src/lib/notifications.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  let token: string | undefined;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: 'beep_880hz.wav',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Permiso de notificación no concedido');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;

    // Actualizar FCM Token en la tabla profiles de Supabase
    if (token && userId) {
      await supabase
        .from('profiles')
        .update({ fcm_token: token })
        .eq('id', userId);
    }
  }

  return token;
}
`,

    layout_tsx: `// app/_layout.tsx
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { DataProvider } from '../src/context/DataContext';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';
import '../global.css';

function RootNavigation() {
  const { currentUser, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!currentUser && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (currentUser) {
      // Registrar FCM Push Notifications
      registerForPushNotificationsAsync(currentUser.id);

      // Redireccionar según el rol
      if (inAuthGroup || segments.length === 0) {
        if (currentUser.role === 'super_admin') {
          router.replace('/(super)/dashboard');
        } else if (currentUser.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else if (currentUser.role === 'resident') {
          router.replace('/(resident)');
        } else if (currentUser.role === 'guard') {
          router.replace('/(guard)/dashboard');
        }
      }
    }
  }, [currentUser, isLoading, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DataProvider>
        <RootNavigation />
      </DataProvider>
    </AuthProvider>
  );
}
`,

    package_json: `{
  "name": "conjuntos-app-mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "build:android": "eas build --platform android --profile production"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "1.23.1",
    "@supabase/supabase-js": "^2.49.1",
    "clsx": "^2.1.1",
    "expo": "~54.0.8",
    "expo-constants": "~17.1.0",
    "expo-device": "~7.1.0",
    "expo-image-picker": "~16.1.0",
    "expo-notifications": "~0.30.0",
    "expo-router": "~4.2.0",
    "expo-secure-store": "~14.1.0",
    "expo-status-bar": "~2.1.0",
    "jspdf": "^2.5.2",
    "lucide-react-native": "^0.475.0",
    "nativewind": "^4.0.1",
    "react": "18.3.1",
    "react-native": "0.78.0",
    "react-native-reanimated": "~3.16.1",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.4.0",
    "react-native-url-polyfill": "^2.0.0",
    "tailwind-merge": "^3.0.1"
  },
  "devDependencies": {
    "@types/react": "~18.3.12",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.3.3"
  },
  "private": true
}`,
  };

  const handleCopySnippet = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      soundEngine.playSuccessChime();
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Código y Configuración Expo React Native (SDK 54 - Cliente v54.0.8)"
        subtitle="Estructura de archivos y configuración para Android listo para compilar con Expo Go (v54.0.8) y EAS Build"
        badge={<Badge variant="purple">Expo SDK 54 • Cliente v54.0.8 • Supabase</Badge>}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleCopySnippet(codeSnippets[activeTab] || fileTree)}
            icon={<Copy className="h-4 w-4" />}
          >
            {copied ? '¡Copiado!' : 'Copiar Código'}
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-slate-200/80 p-1 rounded-2xl text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('structure')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'structure' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📁 Árbol de Archivos Expo
        </button>
        <button
          onClick={() => setActiveTab('app_json')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'app_json' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          ⚙️ app.json (Android FCM)
        </button>
        <button
          onClick={() => setActiveTab('supabase_sql')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'supabase_sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🐘 Migración SQL Supabase
        </button>
        <button
          onClick={() => setActiveTab('supabase_ts')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'supabase_ts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🔐 lib/supabase.ts (SecureStore)
        </button>
        <button
          onClick={() => setActiveTab('notifications_ts')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'notifications_ts' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🔔 lib/notifications.ts
        </button>
        <button
          onClick={() => setActiveTab('layout_tsx')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'layout_tsx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          🧭 app/_layout.tsx
        </button>
        <button
          onClick={() => setActiveTab('package_json')}
          className={`py-2 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'package_json' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          📦 package.json
        </button>
      </div>

      {/* Code Viewer Container */}
      <Card noPadding className="bg-slate-950 border-slate-800 text-white overflow-hidden shadow-2xl">
        <div className="bg-slate-900/90 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500" />
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="ml-2 font-mono text-xs text-slate-400">
              {activeTab === 'structure' ? 'Estructura Expo Router SDK 52' : `${activeTab}.code`}
            </span>
          </div>

          <button
            onClick={() => handleCopySnippet(codeSnippets[activeTab] || fileTree)}
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800/80 cursor-pointer"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copiado' : 'Copiar Archivo'}</span>
          </button>
        </div>

        <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-xs text-emerald-400 leading-relaxed max-h-[580px] select-text">
          {activeTab === 'structure' ? fileTree : codeSnippets[activeTab]}
        </pre>
      </Card>
    </div>
  );
};
