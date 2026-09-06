# Conjuntos App

Sistema SaaS integral de gestión residencial multi-tenant (multi-conjunto)
con Web, **PWA instalable** en celulares y **APK Android nativa**.
Stack: **React + Vite** (frontend), **Supabase** (PostgreSQL + Auth + RLS + Realtime),
**Firebase Cloud Messaging (FCM)** (notificaciones push estilo WhatsApp) y
**Capacitor 8** (empaquetado Android).

---

## 🌐 URLs Públicas

- **PWA + Web**: <https://conjuntos-app-pwa.vercel.app>
- **APK Android (debug)**: `android/app/build/outputs/apk/debug/app-debug.apk`
  - Se genera localmente (ve la sección *Capacitor / APK Android*).

---

## 🏗️ Arquitectura

### Dos clientes, una misma base de datos

| Cliente | Cómo funciona | Actualizaciones automáticas |
|---------|---------------|------------------------------|
| **PWA / Web** (Chrome / Safari / Edge) | Frontend React + Service Worker. Conexión directa a Supabase con `VITE_SUPABASE_ANON_KEY`. | **Sí**, por `serviceWorker` + despliegue Vercel. |
| **APK Android / Capacitor** | Mismo frontend React empaquetado en un `WebView` Android nativo. Usa **Capacitor Live Server** que apunta **al dominio de Vercel**, NO a los assets locales. | **Sí**, al abrir la APK lee los últimos cambios de Vercel. Solo hay que recompilar APK si cambias código nativo (AndroidManifest, iconos, plugins). |
| **Backend Express (opcional)** | `server.ts` con rutas de negocio y WebSocket. Útil si necesitas validaciones que no quieres en Edge Functions. | Despliegue por separado en Render u otro hosting. |

### Reglas de seguridad (IMPORTANTE)

- **NUNCA pongas `SUPABASE_SERVICE_ROLE_KEY` en código del frontend / `dist` / APK.**
- **Solo el `VITE_SUPABASE_ANON_KEY` va en el cliente.**
- Las validaciones sensibles (límites de planes, aprobación de pagos, auditoría) deben hacerse en **Edge Functions de Supabase** (recomendado) o en el backend Express (con `SUPABASE_SERVICE_ROLE_KEY`).
- RLS (Row Level Security) está en `supabase-auth-secure-migration.sql`.

### Diagrama de una notificación push

```
  Evento en Supabase (anuncio/reserva/incidente)
            │
            ▼
  DataContext.jsx detecta Realtime INSERT/UPDATE
            │
            ▼
  sendPushToMany(userId[])  ────►  Edge Function  send-push
  (pushNotifications.ts)          (supabase/functions/send-push/index.ts)
                                          │
                                          ▼
                                 FCM HTTP v1 API  (priority: high Android)
                                          │
                    ┌─────────────────────┴────────────────────┐
                    ▼                                          ▼
          Service Worker FCM                        Plugin @capacitor/push-notifications
          (PWA, app cerrada / 2do plano)             (APK Android, app cerrada)
                    │                                          │
                    ▼                                          ▼
           showNotification()                         NotificationManager.MAX
          (barra superior, heads-up)                (barra superior, canal importancia HIGH)
```

---

## 👥 Roles y permisos

| Rol | Acceso |
|-----|--------|
| **Super Admin** | Conjuntos residenciales, planes, administradores, auditoría global. |
| **Admin / Administrador** | Su conjunto: residentes, apartamentos, guardas, anuncios, incidencias, reservas, visitantes. |
| **Resident** | Su apartamento: reservas, pases de visita, reportar incidencias, ver anuncios. |
| **Guard (Guarda de seguridad)** | Validar visitantes, control de acceso del conjunto. |

---

## 🚀 Inicio rápido (desarrollo local)

### Requisitos

- Node.js **20+**
- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, para desplegar Edge Functions)
- **Java 17 o 21** (solo para compilar la APK)
- Cuentas: Supabase + Firebase + Vercel (todas tienen tier gratuitas)

### 1. Instalar dependencias

```powershell
npm install
```

### 2. Crear archivo `.env`

Copía `.env.example` a `.env` y rellena:

```env
# ===== Supabase =====
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...SERVICE_ROLE... (solo backend local)
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...ANON_KEY... (pública, OK en frontend)

# ===== (Opcional) Backend Express =====
# VITE_API_BASE_URL=https://tu-backend.onrender.com
# VITE_WS_BASE_URL=wss://tu-backend.onrender.com
# CAPACITOR_API_URL=https://tu-backend.onrender.com

# ===== Firebase Cloud Messaging =====
VITE_FIREBASE_API_KEY=AIza... (Firebase Console → Project Settings → Apps)
VITE_FIREBASE_PROJECT_ID=conjuntos-app-XXXXX
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456...
VITE_FIREBASE_VAPID_KEY=AAAAXXXXX... (Web Push certificates → Key pair)
```

### 3. Levantar la web localmente

```powershell
npm run dev
```

→ Abre <http://localhost:5173>

### 4. Build de producción

```powershell
npm run build
# → carpeta dist/ (Vercel despliega esta carpeta)
```

---

## 🗄️ Base de datos (Supabase)

Scripts SQL (raíz del proyecto):

| Archivo | Propósito | Cuándo ejecutar |
|---------|-----------|-----------------|
| `supabase-migration.sql` | Esquema inicial (tablas, funciones básicas). | 1 vez, al crear el proyecto. |
| `supabase-auth-secure-migration.sql` | ⭐ Vincula `profiles.auth_user_id` → `auth.users`, **agrega RLS seguro**. | **Justo después** del script anterior. |
| `supabase-push-tokens.sql` | Crea la tabla `push_tokens` (multi-dispositivo). | 1 vez, antes de usar notificaciones. |
| `supabase-auth-trigger-fix.sql` | Repara triggers duplicados de `auth.users` que rompen el alta de usuarios. | Si `admin-create` o `guard-create` fallan con *Database error*. |

### Orden obligatorio de migración

```sql
-- 1. En SQL Editor (Supabase)
supabase-migration.sql            → ejecutar
supabase-auth-secure-migration.sql → ejecutar
supabase-push-tokens.sql          → ejecutar
-- (solo si falla el alta) supabase-auth-trigger-fix.sql
```

### Tablas principales

```
residential_complexes ──► apartments ──► residents_in_apartments
           │                  │
           ▼                  ▼
     profiles (users)   bookings / reservations
           │
 announcements ──► announcement_comments
 incidents      visitors        audit_logs
 notifications  push_tokens
```

---

## 🔔 Notificaciones push (Estilo WhatsApp)

El objetivo: que llegue en **primer plano, segundo plano y con la APP TOTALMENTE CERRADA**, exactamente igual que WhatsApp.

### ¿Cómo se consigue?

La clave está en **2 ajustes combados**:

1. **El mensaje FCM enviado por el servidor (Edge Function) debe tener `priority: high` (Android).**
   Android en modo Doze (ahorro de batería) POSTERGA los mensajes `priority: normal` hasta que el celular se despierte.
   Con `priority: high`, FCM despierta al teléfono y entrega el mensaje inmediatamente.

2. **El dispositivo tiene un canal/permiso de IMPORTANCIA_ALTA / MÁXIMA** (para APK)
   o el Service Worker (para PWA) con `onBackgroundMessage`.

### 1. Configurar Firebase (una vez)

1. Firebase Console → **Create project** (o usa uno existente).
2. Project Settings → **Your apps → Add app → Web app** → copia la config a tu `.env`.
3. Project Settings → **Cloud Messaging**:
   - Habilitar **Firebase Cloud Messaging API (V1)** (este es el que usa la Edge Function).
   - Genera **Web Push certificates (Key pair)** → copia la *key* a `VITE_FIREBASE_VAPID_KEY`.
4. Project Settings → **Service accounts → Generate new private key** (JSON).
   De este JSON, debes crear **3 Secrets en Supabase → Edge Functions**:
   ```
   FIREBASE_PROJECT_ID   = tu-project-id
   FIREBASE_CLIENT_EMAIL = firebase-adminsdk@...iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY  = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   Para establecerlos localmente:
   ```powershell
   supabase secrets set FIREBASE_PROJECT_ID=tu-project-id
   supabase secrets set FIREBASE_CLIENT_EMAIL=...
   supabase secrets set --env-file .env
   # (o pon FIREBASE_PRIVATE_KEY en un archivo y léelo)
   ```

### 2. Desplegar la Edge Function `send-push`

Cada vez que modifiques `supabase/functions/send-push/index.ts`:

```powershell
supabase functions deploy send-push --project-ref TU-PROYECTO
```

> ⚠️ Sin este paso, las push seguirán enviándose con prioridad normal y Android las retrasará.

### 3. Flujo en el cliente (PWA / APK)

1. Usuario inicia sesión.
2. **~3 segundos después se dispara el auto-prompt estilo WhatsApp**
   (si la plataforma lo permite). En APK abre el **diálogo NATIVO de Android**
   "¿Permitir notificaciones?". En PWA Chrome abre el diálogo del navegador.
3. Si el usuario *no* acepta, se muestra un **banner verde "Recibe notificaciones · Activar"**
   (y botón idéntico en el sidebar). Este banner *depende de ESTE dispositivo*, no del perfil global.
4. Al aceptar:
   - Se llama a `getToken()` de FCM con el **Service Worker registrado** (`firebase-messaging-sw.js`).
   - El token se guarda en la tabla `push_tokens` con `device_label` (`apk-android`, `pwa-instalada`, `pc`, etc.).
   - Un usuario puede tener **múltiples tokens activos** (celular + PC + tablet). Los envíos van a TODOS.

### 4. Archivos clave de push

| Ubicación | Qué hace |
|-----------|----------|
| [src/lib/pushNotifications.ts](src/lib/pushNotifications.ts) | Orquesta registro multi-dispositivo, guarda token en Supabase, envía `send-push`. |
| [src/lib/capacitorNotifications.ts](src/lib/capacitorNotifications.ts) | Puente nativo Capacitor: `checkPermissions()`, `requestNativeToken()`, `registerNativeSilently()`. |
| [src/lib/firebase.ts](src/lib/firebase.ts) | Cliente FCM web: `getToken`, `requestPushPermission`, `onMessage` (foreground). |
| [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js) | **Service Worker FCM** → `onBackgroundMessage` (PWA app cerrada / 2do plano). Muestra notificación + abre URL correcta al tocar. |
| [android/app/src/main/java/com/conjuntos/app/MainActivity.java](android/app/src/main/java/com/conjuntos/app/MainActivity.java) | Crea canal de notificaciones `IMPORTANCE_HIGH` (Android 8+) en tiempo de ejecución (estilo WhatsApp: vibración, luces, bypass DND). |
| [supabase/functions/send-push/index.ts](supabase/functions/send-push/index.ts) | Envía al servidor FCM con `android.priority: high`, `android.notification.priority: MAX`, `webpush.urgency: high`, `apns-priority: 10`. |

### 5. Probar push paso a paso

1. Despliega `send-push` y la PWA en Vercel.
2. Instala / abre la PWA en tu celular **(Chrome Android)**.
3. Inicia sesión → acepta el permiso.
4. Abre el **sidebar lateral** → **Notificaciones activas · Probar**.
5. En Supabase, tabla `push_tokens`, verifica que exista un registro para ese usuario.
6. **Cierra TOTALMENTE Chrome / la PWA** (deslízala de recientes).
7. Desde otro dispositivo (PC) o sesión incógnita → envía otra push de prueba (botón Probar o crea un anuncio/reserva).
8. ✅ Debe llegar en la barra superior del celular aunque la app esté cerrada.

---

## 📱 Capacitor / APK Android

### 🧠 Concepto clave: Live Server (OTA automático)

En [capacitor.config.ts](capacitor.config.ts):

```ts
server: {
  url: 'https://conjuntos-app-pwa.vercel.app',
  cleartext: true,
  allowNavigation: ['*'],
}
```

Esto significa que **la APK NO abre `assets/public/index.html` local**, sino que carga
el dominio de Vercel directamente dentro del `WebView` nativo de Android.

Consecuencias (muy útiles):

| Tipo de cambio | ¿Requiere recompilar APK? |
|----------------|---------------------------|
| React, componentes, texto, colores, lógica TS/JS | ❌ No → solo sube a Vercel, cierra y abre la APK |
| Archivos de `public/` (manifest, SW, íconos SVG/PNG) | ❌ No (mismos assets son servidos por Vercel) |
| Supabase Edge Functions / RLS / Base de datos | ❌ No |
| `AndroidManifest.xml` (permisos, servicio FCM) | ✅ Sí → nueva APK |
| `MainActivity.java` (canal de notificaciones) | ✅ Sí |
| Plugins nativos (ej. camera, local auth) | ✅ Sí |
| Ícono launcher nativo de la APK (`mipmap-*`) | ✅ Sí |
| `google-services.json` (FCM nativo) | ✅ Sí (colocado una sola vez) |

### 1. Requisitos (solo para compilar APK)

- **Java 17+** (JDK) → Java 21 es el recomendado por Capacitor 8.
  En Windows PowerShell:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
  $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
  java -version
  ```
- `google-services.json` (obligatorio para FCM nativo)

### 2. Agregar `google-services.json` (UNA ÚNICA VEZ)

1. Firebase Console → Project Settings → Your apps → **Add app → Android**
2. Package name → `com.conjuntos.app` (es el `appId` de `capacitor.config.ts`).
3. SHA-1 debug (opcional): puedes omitirlo, o si tienes Android Studio:
   ```powershell
   keytool -J-Duser.language=en -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android -keypass android
   ```
4. Descarga `google-services.json`.
5. Colócalo en:
   ```
   android/app/google-services.json
   ```
   (Está en `.gitignore`, **no se sube al repositorio**, contiene secrets).

### 3. Build APK Debug

```powershell
# 1. Build web (si no lo hiciste)
npm run build

# 2. Copiar dist/ a assets/ del proyecto Android
npx cap sync android

# 3. Compilar la APK con Gradle
cd android
.\gradlew.bat assembleDebug

# → APK: android\app\build\outputs\apk\debug\app-debug.apk
```

### 4. Instalar en el celular

```powershell
# Opción A) ADB
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Opción B) Transfiere el APK al celular por USB / WhatsApp / Drive → toca "Instalar"
```

Al abrirla:
1. Inicia sesión.
2. Espera ~3 segundos → diálogo nativo Android "Permitir notificaciones".
3. Acepta → token se guarda en `push_tokens` como `apk-android`.

---

## 🌐 PWA: Instalar app en pantalla de inicio

1. En **Chrome Android** abre <https://conjuntos-app-pwa.vercel.app>.
2. Inicia sesión (primer uso, así registra el push).
3. Menú de los **3 puntos** arriba a la derecha → **Instalar aplicación** → "Agregar a pantalla de inicio".
4. Se crea un ícono con nombre *Conjuntos*. Al abrirlo funciona como app nativa (pantalla completa, sin barra de Chrome).

### OTA automático en la PWA

El Service Worker `firebase-messaging-sw.js` + `registerPwa()` en [src/pwa.js](src/pwa.js) hacen:

- `skipWaiting()` → nueva versión del SW se activa al instante.
- `clients.claim()` → todas las ventanas/pestañas usan el SW nuevo sin recargar.
- Limpia cualquier SW huérfano (`/sw.js`, que existía antes y rompía FCM).
- Al detectar actualización, si el controlador ya existe, recarga la página una sola vez.

> **Tip si no llegan las push:** Reinstalar la PWA. En Chrome Android →
> Configuración → Configuración del sitio → Notificaciones →
> busca `conjuntos-app-pwa.vercel.app` → **Restablecer y borrar**.
> Luego vuelve a abrir la URL e instala de 0.

---

## 🚀 Despliegues

### 1. Vercel (Web + PWA)

Cada vez que cambies código del frontend:

```powershell
npm run build
npx vercel --prod --yes
```

Si es la primera vez: `npx vercel link` → login → nombre `conjuntos-app-pwa` →
agrega todas las variables `VITE_*` como Project Environment Variables en Vercel Dashboard → Settings → Environment Variables.

### 2. Edge Functions Supabase

Cada vez que toques `supabase/functions/`:

```powershell
# Lista de funciones
supabase functions list

# Desplegar individualmente
supabase functions deploy send-push
supabase functions deploy admin-create
supabase functions deploy guard-create
```

`admin-create` y `guard-create` usan `service_role` para crear usuarios Auth directamente
y luego insertar perfil. Son endpoints seguros (no permiten creación anónima).

### 3. Backend Express en Render (opcional)

Si quieres las rutas de `server.ts` hosteadas 24/7 sin tu PC encendida:

1. Render → **New → Blueprint** → selecciona tu repo. Detecta `render.yaml`.
2. Variables Render Dashboard (Environment) → agrega `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
3. Espera a que `/api/health` responda `200`.
4. Copia la URL de Render a tu `.env` / Vercel como:
   ```
   VITE_API_BASE_URL=https://conjuntos-backend.onrender.com
   VITE_WS_BASE_URL=wss://conjuntos-backend.onrender.com
   CAPACITOR_API_URL=https://conjuntos-backend.onrender.com
   ```
5. Redeploya Vercel (`npx vercel --prod --yes`).

---

## 🧪 Checklist de pruebas pre-publicación

- [ ] Login con un usuario real (Supabase Auth)
- [ ] `super_admin` puede crear conjuntos / administradores
- [ ] `admin` solo ve a SU conjunto (RLS)
- [ ] `resident` solo ve su apartamento / sus reservas
- [ ] Intentar modificar reserva ajena → rechazado (RLS o RPC)
- [ ] Anuncio creado en Admin aparece en 2do celular (Realtime)
- [ ] Botón lateral **Probar notificación** llega a la barra superior de AMBOS (PWA + APK)
- [ ] App totalmente cerrada, push llega (background)
- [ ] Responsive 360px (celular antiguo): sin overflow horizontal de página; tablas scrollean internas
- [ ] En `dist/` ni en assets/apk NO aparece la palabra `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔧 Troubleshooting (FAQ)

### ❌ Las push solo me llegan a Chrome PC, no a la PWA del celular.

**Diagnóstico + Fix:**

1. El Service Worker anterior (`/sw.js`) dejó basura. **Reinstala la PWA desde cero.**
   - Chrome Android → Configuración → Configuración del sitio → Notificaciones → Restablecer.
2. Asegúrate de haber desplegado `firebase-messaging-sw.js` (nuevo código con config real)
   → visita `https://TU-DOMINIO/firebase-messaging-sw.js` y compruébalo.
3. En Firebase Console, verifica que el `gcm_sender_id` del viejo manifest obsoleto
   ya no importa (el manifest nuevo no lo usa, pero FCM lo gestiona internamente con la config).

### ❌ Gradle falla con `invalid source release: 21`.

Tu `JAVA_HOME` apunta a Java < 17. Cambia la variable de entorno antes del build:

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.4.7-hotspot"
```

Este proyecto ya tiene un parche en [android/build.gradle](android/build.gradle) que fuerza
compatibilidad Java 17 en todos los submódulos (para evitar el error incluso con JDK 17).

### ❌ Al intentar crear un Admin / Guarda, aparece *Database error creating new user*.

Ejecuta **`supabase-auth-trigger-fix.sql`** en el SQL Editor de Supabase.
Un trigger auto-creado por extensiones intenta insertar `profiles` y rompe el alta
(la app ya inserta `profiles` en el Edge Function después de crear `auth.users`).

### ❌ El botón "Probar notificación" no dice nada y no llega.

Abre **DevTools (F12) → Network → Filtra `send-push`**:
- Status 500 → tu Edge Function tiene error. Mira logs de Edge Function en Supabase Dashboard.
  Causas frecuentes: `FIREBASE_PRIVATE_KEY` sin saltos `\n`, API FCM no habilitada en Google Cloud.
- Status 401 → falta `Authorization: Bearer ANON_KEY` (el frontend lo pasa automáticamente).
- Status 200 pero no llega → ver tabla `push_tokens`: no hay token → permiso no otorgado en ese dispositivo.

### ❌ La APK al abrirla no pide permiso automáticamente.

Esperalo **3 segundos** después del login. Si se rechazó una vez, Android ya no muestra diálogo.
En ese caso:
- Ajustes Android → Apps → Conjuntos App → Notificaciones → **Permitir**.
- Luego reinicia la APK (cerrar y abrir).

---

## 🛡️ Seguridad (IMPORTANTE)

- **Jamás compartas / comitees** `google-services.json`, `.env`, `.env.local`, `service-account.json`.
- Todos están en `.gitignore`.
- Si `SUPABASE_SERVICE_ROLE_KEY` se llegó a filtrar, **revócala ya mismo**
  (Supabase Dashboard → Project Settings → API → Service Role → Rotate).
- Ante duda: nunca uses `USING (true)` / `WITH CHECK (true)` en políticas de tablas con datos reales.
  Las plantillas viejas que permitían eso deben ser **sobrescritas con `supabase-auth-secure-migration.sql`**.

---

## 📁 Estructura rápida del proyecto

```
conjuntos-app/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ capacitor.config.ts              # Config Capacitor Android (Live Server Vercel)
├─ android/                         # Proyecto Android (Gradle)
│  └─ app/src/main/
│     ├─ AndroidManifest.xml        # Permisos + servicios FCM + Intents
│     ├─ java/com/conjuntos/app/MainActivity.java  # Canal notificaciones HIGH
│     ├─ res/values/colors.xml      # Ícono/acento
│     └─ assets/public/             # Build web (solo fallback, Capacitor usa URL de Vercel)
├─ src/
│  ├─ App.jsx                       # Rutas + Routing
│  ├─ main.jsx                      # Mount React + registerPwa()
│  ├─ pwa.js                        # Service Worker registration + cleanup SW huérfanos
│  ├─ context/
│  │  ├─ AuthContext.jsx            # Sesión, perfil, complejo actual
│  │  └─ DataContext.jsx            # CRUD, Realtime, triggers push
│  ├─ lib/
│  │  ├─ firebase.ts                # FCM web
│  │  ├─ capacitorNotifications.ts  # FCM nativo Capacitor
│  │  ├─ pushNotifications.ts       # Orquesta ambos flujos + multi-device
│  │  ├─ supabaseClient.js          # Browser Supabase client
│  │  ├─ supabaseRepo.js            # Lecturas Supabase
│  │  └─ config.js                  # Variables centralizadas
│  └─ components/ (UI React)
├─ public/
│  ├─ manifest.webmanifest          # Íconos PNG, shortcuts, display standalone
│  ├─ firebase-messaging-sw.js      # Service Worker FCM (onBackgroundMessage)
│  └─ icons/ icon-192/512 .svg + .png
├─ supabase/
│  └─ functions/
│     ├─ send-push/index.ts         # Envía FCM HTTP v1 con priority: HIGH
│     ├─ admin-create/index.ts
│     └─ guard-create/index.ts
├─ *.sql (migraciones Supabase)
└─ README.md (este archivo)
```

---

## 🤖 Guía rápida para seguir trabajando con una IA

1. Primero lee `package.json`, `src/lib/*`, `src/context/*`.
2. Pregúntate: ¿este cambio toca *React/CSS* (OTA Vercel) o *nativo Android* (nueva APK)?
3. Si toca notificaciones: ejecuta **build web** + deploy Vercel.
4. Si toca Android: `npx cap sync android` + `assembleDebug`.
5. Nunca incluyas `service_role` en JS del frontend.
6. Después de cada cambio importante → `npm run build` exitoso es la 1ª prueba.

Proyecto de uso interno / privado.
