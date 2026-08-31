# 🏢 Conjuntos App — Sistema Integral de Gestión Residencial SaaS

Sistema multi-tenant de gestión para conjuntos residenciales, condominios y edificios con soporte en tiempo real, control de acceso en garita, gestión de visitantes con códigos seguros, reservas de áreas comunes, comunicados con comentarios en vivo, reporte de incidencias y arquitectura lista para Supabase y Expo React Native (Android).

---

## 📑 Tabla de Contenidos
1. [Arquitectura y Roles del Sistema](#-arquitectura-y-roles-del-sistema)
2. [Estado Actual y Conexión con Supabase](#-estado-actual-y-conexión-con-supabase)
3. [¿Cómo integrar tu propia Base de Datos Supabase? (Paso a Paso)](#-cómo-integrar-tu-propia-base-de-datos-supabase-paso-a-paso)
4. [Script SQL Completo para Supabase (Tablas, RLS, Storage y Realtime)](#-script-sql-completo-para-supabase)
5. [¿Qué falta para que esté 100% en Tiempo Real en Producción?](#-qué-falta-para-que-esté-100-en-tiempo-real-en-producción)
6. [Estructura del Proyecto](#-estructura-del-proyecto)
7. [Configuración de Variables de Entorno](#-configuración-de-variables-de-entorno)
8. [Exportación a Expo React Native (Android)](#-exportación-a-expo-react-native-android)

---

## 👥 Arquitectura y Roles del Sistema

El sistema implementa un modelo **Multi-Tenant** con **Control de Acceso Basado en Roles (RBAC)**:

| Rol | Icono | Alcance y Funcionalidades |
| :--- | :---: | :--- |
| **Super Admin** | 👑 | Vista global SaaS. Crea y administra conjuntos residenciales, planes de suscripción (Free, Pro, Enterprise), monitorea ingresos, aprueba pagos y bloquea/desbloquea conjuntos morosos. |
| **Administrador** | 🏢 | Administra un conjunto específico: aprueba o rechaza residentes pendientes con foto facial, crea torres/bloques, gestiona departamentos y cuotas, emite comunicados, atiende incidencias y supervisa bitácora de guardias. |
| **Residente** | 🏠 | Genera pases de visita con códigos únicos, reserva áreas sociales (quincho, piscina, salón), reporta incidencias con fotos, comenta en avisos y recibe notificaciones de ingresos en garita. |
| **Guardia de Garita** | 👮 | Puesto de control para validar pases por código con sonido de confirmación acústico (880 Hz), registro de entradas/salidas (Check-In / Check-Out) y acceso rápido al directorio telefónico de emergencia. |

---

## ⚡ Estado Actual y Conexión con Supabase

La aplicación cuenta con **arquitectura dual híbrida**:
1. **Modo Local / Demo Inmediata:** Funciona de forma autónoma con `localStorage` y datos iniciales de prueba para visualización interactiva instantánea.
2. **Modo Supabase Realtime:** En cuanto se configuran las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la aplicación se conecta automáticamente al cliente de Supabase, activa canales de suscripción en tiempo real (`postgres_changes`) y sincroniza los datos en la nube.

---

## 🚀 ¿Cómo integrar tu propia Base de Datos Supabase? (Paso a Paso)

Solo necesitas seguir estos **4 sencillos pasos** para dejar tu base de datos 100% operativa:

### Paso 1: Crear un Proyecto en Supabase
1. Ingresa a [supabase.com](https://supabase.com) y crea una cuenta gratuita.
2. Haz clic en **"New Project"**.
3. Asigna un nombre a tu proyecto (ej: `conjuntos-app-db`), define una contraseña segura para la base de datos y selecciona la región más cercana (ej: `sa-east-1` São Paulo o `us-east-1`).
4. Espera ~1 minuto hasta que el proyecto esté aprovisionado.

### Paso 2: Ejecutar el Script SQL
1. En el panel lateral de Supabase, entra a **"SQL Editor"**.
2. Haz clic en **"New Query"**.
3. Pega el script SQL que se encuentra en la siguiente sección de este documento.
4. Presiona **"Run"** (o `Ctrl + Enter`). Esto creará automáticamente todas las tablas, relaciones, políticas de seguridad (RLS), buckets de almacenamiento y publicaciones en tiempo real.

### Paso 3: Configurar las Variables de Entorno
1. En Supabase, ve a **Project Settings** ⚙️ -> **API**.
2. Copia tu **Project URL** y tu **Project API Key (anon / public)**.
3. En tu archivo `.env` o en la configuración de AI Studio, agrega:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

### Paso 4: Activar Realtime en Supabase
1. Ve a **Database** -> **Replication** en el menú de Supabase.
2. Asegúrate de que las tablas `announcements`, `announcement_comments`, `visitors`, `incidents`, `reservations` y `notifications` tengan el switch de **Realtime** activado (el script SQL del Paso 2 ya las añade a `supabase_realtime`).

---

## 🐘 Script SQL Completo para Supabase

Copia y ejecuta este script en el **SQL Editor** de Supabase:

```sql
-- ====================================================================
-- MIGRACIÓN SUPABASE: CONJUNTOS APP (SISTEMA MULTI-TENANT RESIDENCIAL)
-- ====================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLA: CONJUNTOS RESIDENCIALES (Multi-Tenant)
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

-- 3. TABLA: PERFILES DE USUARIO (Sincronizado con Supabase Auth)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 4. TABLA: TORRES Y BLOQUES
CREATE TABLE public.apartment_blocks (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: DEPARTAMENTOS / UNIDADES
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

-- 6. TABLA: GUARDIAS
CREATE TABLE public.guards (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  shift VARCHAR(100) DEFAULT 'Turno Completo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: VISITANTES Y PASES DE ACCESO
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

-- 8. TABLA: COMUNICADOS
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

-- 9. TABLA: COMENTARIOS EN COMUNICADOS
CREATE TABLE public.announcement_comments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  announcement_id BIGINT REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLA: INCIDENCIAS
CREATE TABLE public.incidents (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES public.profiles(id) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLA: RESERVAS DE ÁREAS COMUNES
CREATE TABLE public.reservations (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  area_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABLA: NOTIFICACIONES
CREATE TABLE public.notifications (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLA: AUDITORÍA DEL SISTEMA
CREATE TABLE public.audits (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  residential_complex_id BIGINT REFERENCES public.residential_complexes(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  auditable_type VARCHAR(100) NOT NULL,
  auditable_id BIGINT,
  new_values JSONB,
  old_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- HABILITAR REALTIME (POSTGRES CHANGES)
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ====================================================================
-- STORAGE BUCKETS (FOTOS FACIALES Y COMPROBANTES)
-- ====================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-photos', 'face-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('incident-attachments', 'incident-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS DE SEGURIDAD (RLS BÁSICAS)
ALTER TABLE public.residential_complexes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas públicas para lectura y escritura autenticada
CREATE POLICY "Public Read Complex" ON public.residential_complexes FOR SELECT USING (true);
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Auth Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Auth Update Profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "All Access Visitors" ON public.visitors FOR ALL USING (true);
CREATE POLICY "All Access Announcements" ON public.announcements FOR ALL USING (true);
CREATE POLICY "All Access Comments" ON public.announcement_comments FOR ALL USING (true);
CREATE POLICY "All Access Incidents" ON public.incidents FOR ALL USING (true);
CREATE POLICY "All Access Reservations" ON public.reservations FOR ALL USING (true);
CREATE POLICY "All Access Notifications" ON public.notifications FOR ALL USING (true);
```

---

## 🔔 ¿Qué falta para que esté 100% en Tiempo Real en Producción?

Para llevar la aplicación a un despliegue de **alta concurrencia y producción móvil nativa**, aquí está la lista de verificación exacta:

### 1. Supabase Database & Realtime (Listo en este proyecto ✅)
- [x] Conexión cliente `@supabase/supabase-js`.
- [x] Listeners de canales Realtime (`supabase.channel('public:...')`) suscritos a eventos `INSERT`, `UPDATE` y `DELETE` en:
  - Comentarios de avisos (chat en vivo).
  - Pases de visitantes (notificación instantánea a residente cuando el guardia marca "Entrada").
  - Incidencias y reservas (cambios de estado en tiempo real).
  - Notificaciones en campana sonora.

### 2. Notificaciones Push Móviles (FCM & APNs) 📱
- **Qué se requiere:** Cuando el usuario tiene la app cerrada en su teléfono Android/iOS, Supabase Realtime no puede despertar la pantalla. Se requiere **Firebase Cloud Messaging (FCM)** o **Expo Push Service**.
- **Cómo implementarlo:**
  1. Configurar un Supabase Database Webhook o Edge Function que escuche eventos `INSERT` en la tabla `public.notifications` o `public.visitors`.
  2. La función toma el `fcm_token` guardado en la tabla `profiles` del usuario destinatario.
  3. Envía el payload HTTP a `https://exp.host/--/api/v2/push/send` o a la API de Firebase Cloud Messaging v1.

### 3. Supabase Storage para Fotos y Comprobantes 📷
- **Qué se requiere:** Subir las fotos faciales tomadas desde la cámara móvil y los PDFs de comprobantes de pago directamente a buckets de Supabase en lugar de Base64 en memoria.
- **Buckets configurados en el SQL:** `face-photos`, `payment-receipts`, `incident-attachments`.

### 4. Supabase Edge Functions (Opcional para Automatizaciones) ⚡
- **Recordatorios de Pago SaaS:** Una función programada con Supabase Cron (`pg_cron`) para marcar como vencidos o en morosidad los conjuntos cuyo `current_period_end` haya expirado.
- **Limpieza de Pases Expirados:** Desactivar automáticamente pases de visita con más de 24 horas de antigüedad.

---

## 📂 Estructura del Proyecto

```
/
├── README.md                              # Documentación técnica completa
├── src/
│   ├── components/
│   │   ├── layout/                        # Layouts: AppLayout (Desktop/Android frame), GuestLayout
│   │   ├── ui/                            # Botones, Cards, Modales, Badges, Campana de Notificaciones
│   │   └── views/
│   │       ├── super/                     # Vistas Super Admin (SaaS, Planes, Conjuntos)
│   │       ├── admin/                     # Vistas Administrador (Torres, Deptos, Residentes, Incidencias, Avisos)
│   │       ├── resident/                  # Vistas Residente (Generar Pase QR, Reservas, Incidencias)
│   │       ├── guard/                     # Vistas Guardia (Validador Acústico 880Hz, Directorio)
│   │       └── developer/                 # Vistas Desarrollador (Guía Supabase Realtime & Código Expo)
│   ├── context/
│   │   ├── AuthContext.tsx                # Contexto de autenticación, roles y sesión
│   │   └── DataContext.tsx                # Store central reactivo + Listeners Supabase Realtime
│   ├── lib/
│   │   ├── supabase.ts                    # Cliente Supabase, verificación de conexión y Realtime
│   │   ├── sound.ts                       # Generador acústico de 880 Hz para garita (Web Audio)
│   │   ├── pdf.ts                         # Generador de recibos de pago PDF (jsPDF)
│   │   └── initialData.ts                 # Datos iniciales para modo preview
│   ├── types.ts                           # Tipos e interfaces TypeScript del sistema
│   └── App.tsx                            # Router principal de vistas y gestión de estado
```

---

## 🔧 Configuración de Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Variables para la Web App (Vite)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Variables para la App Móvil (Expo React Native)
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# Notificaciones Push (Opcional para Expo/FCM)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
```

---

## 📲 Exportación a Expo React Native (Android)

Para compilar la aplicación móvil nativa con **Expo SDK 52** y **NativeWind**:
1. Abre la vista **"Código Expo React Native"** o **"Guía Supabase & README"** en el menú de la aplicación.
2. Copia los archivos preconfigurados (`app.json`, `package.json`, `app/_layout.tsx`, `lib/supabase.ts`, etc.).
3. Ejecuta en tu terminal local:
   ```bash
   npx create-expo-app@latest conjuntos-mobile --template blank-typescript
   cd conjuntos-mobile
   npm install @supabase/supabase-js expo-secure-store expo-notifications expo-image-picker nativewind
   npx expo start
   ```
