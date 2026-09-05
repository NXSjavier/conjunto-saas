# Conjuntos App

Sistema SaaS para administrar conjuntos residenciales desde web y Android. Usa Supabase como fuente de datos y autenticacion, React/Vite para la interfaz, Firebase Cloud Messaging para notificaciones push y Capacitor para la APK.

## Estado del proyecto

- PWA publicada: `https://conjuntos-app-pwa.vercel.app`.
- Web: compila con `npm run build`.
- Android: compila con Java 21 y genera `android/app/build/outputs/apk/debug/app-debug.apk`.
- Base de datos: Supabase PostgreSQL.
- Realtime: Supabase Realtime en web y movil; WebSocket Express queda como respaldo web.
- Push: Firebase Cloud Messaging via Edge Function `send-push` + tabla `push_tokens` (multi-dispositivo).
- Responsive: layout movil (sidebar drawer, bottom nav, tablas con scroll horizontal, grids colapsables).
- Seguridad: aplicar `supabase-auth-secure-migration.sql` antes de usar datos reales.
- No usar `supabase-standalone-fix.sql`: sus politicas abiertas permiten que cualquier cliente anonimo modifique la base.

## Arquitectura

La aplicacion tiene dos modos:

1. **Web con backend**: el frontend usa las rutas Express para operaciones de negocio y el backend usa `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor.
2. **Android/PWA standalone**: el frontend lee y escribe en Supabase usando `VITE_SUPABASE_ANON_KEY`. Las RLS identifican al usuario mediante Supabase Auth.

La PWA publicada no necesita el backend local ni una IP de tu computadora. Cuando no existe `VITE_API_BASE_URL`, el navegador usa el mismo modo directo a Supabase que Android.

Las reglas sensibles, especialmente reservas, limites de plan, aprobaciones y cambios administrativos, deben mantenerse en backend o en funciones RPC protegidas. Nunca se debe incluir `SUPABASE_SERVICE_ROLE_KEY` en Vite, Capacitor, `dist` o la APK.

## Inicio rapido

Instala dependencias:

```powershell
npm install
```

Crea `.env` local, ignorado por Git:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=clave-solo-para-backend
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=clave-publica-anon
VITE_API_BASE_URL=https://tu-backend-publico.com
VITE_WS_BASE_URL=wss://tu-backend-publico.com
CAPACITOR_API_URL=https://tu-backend-publico.com
VITE_FIREBASE_API_KEY=clave-web-de-firebase
VITE_FIREBASE_PROJECT_ID=tu-project-id
VITE_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
VITE_FIREBASE_APP_ID=tu-app-id
VITE_FIREBASE_VAPID_KEY=tu-vapid-key
```

Desarrollo web:

```powershell
npm run dev
```

Produccion web:

```powershell
npm run build
npm run start
```

## Base de datos y autenticacion

Para una base nueva:

1. Ejecuta `supabase-migration.sql` en el SQL Editor.
2. Verifica que exista el usuario inicial en Supabase Auth.
3. Ejecuta `supabase-auth-secure-migration.sql`.
4. Confirma que `profiles.auth_user_id` quedo vinculado al usuario de `auth.users`.
5. No ejecutes scripts de RLS antiguos despues de la migracion segura.

La migracion segura:

- agrega `profiles.auth_user_id` como referencia a `auth.users`;
- vincula perfiles existentes por correo;
- elimina la obligatoriedad de `profiles.password` y deja de usarla;
- crea funciones seguras para obtener perfil, rol y conjunto actual;
- elimina politicas antiguas y crea politicas por usuario, rol y conjunto;
- mantiene Realtime.

La clave `anon` puede estar en el frontend. La clave `service_role` solo debe existir en `.env` del backend o en variables secretas del hosting.

## Roles y modulos

- `super_admin`: administra conjuntos, planes, administradores y auditoria.
- `admin`: gestiona residentes, apartamentos, guardas, anuncios, incidencias, reservas y visitantes de su conjunto.
- `resident`: consulta su apartamento, solicita reservas, crea pases y reporta incidencias.
- `guard`: valida visitantes y gestiona el control de acceso.

Tablas principales: `residential_complexes`, `profiles`, `apartments`, `visitors`, `announcements`, `announcement_comments`, `incidents`, `reservations`, `notifications`, `push_tokens` y `audit_logs`.

## Notificaciones push (FCM)

Flujo: evento Realtime en `DataContext.jsx` → `sendPushToMany`/`sendPushToUser` (`src/lib/pushNotifications.ts`) → Edge Function `send-push` → FCM HTTP v1 API → celular del usuario (incluso con la app cerrada, via `public/firebase-messaging-sw.js`).

Migracion requerida (una vez por proyecto): ejecutar `supabase-push-tokens.sql` en el SQL Editor. Crea la tabla `push_tokens` con RLS (lectura autenticada, escritura solo del propio `auth.uid()`).

Variables necesarias:

- En Vercel (frontend): `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_VAPID_KEY`.
- En Supabase Edge Function `send-push` (secrets): `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (service account JSON de Firebase Console → Project Settings → Service accounts).
- En Firebase Console → Project Settings → Cloud Messaging: habilitar **Firebase Cloud Messaging API (V1)**.

En el movil, `Notification.requestPermission()` solo funciona con un toque del usuario. Por eso la app NO pide permiso automaticamente al login: muestra un banner verde con boton **Activar** (y un boton **Activar Notificaciones** en el sidebar). Cuando el permiso ya esta otorgado aparece **Notificaciones activas · Probar** para enviar una push de prueba real al dispositivo.

### Error conocido (corregido): las push solo llegaban a la PC

Causa: `profiles.fcm_token` guardaba UN solo token por usuario. Cada login en la PC sobrescribia el token del celular, y el celular dejaba de recibir.

Solucion aplicada:

1. Tabla `push_tokens`: un registro por dispositivo (`auth_user_id`, `token` unico, `device_label`).
2. Los envios consultan `push_tokens` (+ `profiles.fcm_token` como fallback) y mandan a TODOS los dispositivos.
3. El banner ahora depende del estado de ESTE dispositivo (`localStorage`), no del permiso global: si el permiso ya estaba otorgado pero el dispositivo no tiene token, se registra en silencio al abrir la app.

Si un celular no recibe push, verificar en este orden:

1. El banner verde aparece → tocar **Activar** y aceptar el permiso.
2. Si aparece el banner amarillo (bloqueadas): en Chrome tocar el candado junto a la direccion → Permisos → Notificaciones → Permitir.
3. Tocar **Probar** en el sidebar: debe llegar una push de prueba.
4. Confirmar en Supabase que `push_tokens` tiene una fila con el token de ese dispositivo.
5. Si la pagina muestra version vieja: cerrar todas las pestanas del sitio y reabrir (el service worker cachea el shell).

## Responsive movil

Patrones aplicados en las vistas `.jsx` (las que se despliegan; `index.html` carga `main.jsx`):

- Sidebar como drawer lateral + bottom nav en `< lg`; sidebar fijo en desktop.
- Grids colapsables (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`); el calendario de reservas usa siempre 7 columnas.
- Tablas de datos con `overflow-x-auto` + `min-w-[...]` para scroll horizontal en vez de aplastar columnas.
- Barra superior movil: el titulo se oculta bajo 420px para no desbordar en pantallas de 320px.
- Modales con `p-4`, `w-full` y `overflow-y-auto`.

## Android

Requiere Android Studio, Android SDK y Java 21. En Windows:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK resultante:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Instalacion con un telefono conectado y depuracion USB activa:

```powershell
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Si `adb devices` no muestra un dispositivo, la APK puede compilarse pero no probarse fisicamente desde este equipo.

## Instalar la PWA en celulares

Usa esta direccion publica:

```text
https://conjuntos-app-pwa.vercel.app
```

En Android, abre el enlace con Chrome, inicia sesion y selecciona **Instalar aplicacion** o **Agregar a pantalla principal**. La PWA aparecera con icono propio y usara Supabase directamente.

Para publicar cambios visuales:

```powershell
npm run build:web
vercel --prod --yes --name conjuntos-app-pwa
```

Los cambios de React, colores, textos y pantallas se actualizan desde la web sin reinstalar APK. Los cambios nativos de Android, permisos, plugins, icono o Firebase requieren una nueva APK.

El proyecto Vercel queda enlazado localmente mediante `.vercel`, que esta excluido de Git. No subas `.env`, `.env.local` ni claves privadas.

## Pruebas minimas antes de publicar

- Login y cierre de sesion con un usuario Auth real.
- Un residente solo ve informacion de su conjunto.
- Un residente no puede modificar una reserva ajena.
- Un admin solo administra su conjunto.
- Una reserva conflictiva es rechazada de forma atomica.
- Los limites Free, Pro y Enterprise se validan en servidor o RPC.
- Un cambio de reserva, anuncio o visitante aparece en web y Android mediante Realtime.
- Un usuario anonimo no puede leer perfiles, reservas, incidencias o notificaciones.
- No hay `service_role` dentro de `dist`, `android` ni archivos de frontend.
- Push: tocar **Probar** en el sidebar llega al dispositivo; crear un comunicado desde otro dispositivo llega con el titulo real.
- Responsive: en 360px no hay scroll horizontal de pagina (las tablas scrollean dentro de su contenedor).

## Diagnostico

Servidor local:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health -UseBasicParsing
```

Si aparece `EADDRINUSE`, hay otra instancia usando el puerto 3000. Cierra la instancia anterior antes de ejecutar `npm run dev` otra vez.

Si Gradle muestra `invalid source release: 21`, `JAVA_HOME` apunta a Java 17. Configura Java 21 en la terminal actual y vuelve a compilar.

## Publicar el backend en Render

La PWA publicada en Vercel no ejecuta `server.ts`. Para que las operaciones administrativas y validaciones del backend funcionen sin tu computadora encendida, crea el servicio usando `render.yaml`:

1. En Render selecciona **New + > Blueprint**.
2. Conecta el repositorio que contiene este proyecto.
3. Render detectara `render.yaml` y creara `conjuntos-backend`.
4. En las variables privadas del servicio agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
5. Espera a que `/api/health` responda `200`.
6. Copia la URL de Render en Vercel como `VITE_API_BASE_URL`.
7. Publica nuevamente la PWA.

Render puede tener un plan gratuito con suspension por inactividad, segun la cuenta y las condiciones vigentes. Si el servicio se duerme, la primera peticion tarda unos segundos en despertar; Supabase y la PWA siguen siendo servicios separados. El trafico de administradores es bajo, pero el backend tambien atiende las operaciones criticas de reservas, guardas y cuentas.

## Guia para continuar con una IA

Antes de cambiar codigo, la IA debe:

1. Leer `package.json`, `src/lib/config.js`, `src/lib/supabaseClient.js`, `src/lib/supabaseRepo.js`, `src/context/AuthContext.jsx` y `src/context/DataContext.jsx`.
2. Comprobar si el cambio afecta web, Android, Supabase Auth, RLS o las validaciones de reservas.
3. No usar ni pedir claves privadas en el chat. Las claves se leen solo desde `.env` local.
4. Mantener `service_role` fuera del frontend y de la APK.
5. Hacer el cambio minimo y ejecutar primero una prueba enfocada.
6. Ejecutar `npm run build`; si se toca Android, ejecutar tambien `npx cap sync android` y `assembleDebug` con Java 21.
7. No reemplazar RLS seguras por `USING (true)` ni `WITH CHECK (true)` para tablas de negocio.
8. Reportar claramente que se verifico, que no se pudo verificar y que accion requiere el usuario en Supabase o en un dispositivo fisico.

## Archivos clave

- `server.ts`: API Express, reglas de negocio y WebSocket.
- `server/supabase.js`: cliente backend con service role.
- `src/lib/supabaseClient.js`: cliente publico para web/movil.
- `src/lib/supabaseRepo.js`: autenticacion y lecturas directas de Supabase.
- `src/context/AuthContext.jsx`: sesion y perfil actual.
- `src/context/DataContext.jsx`: estado, CRUD y sincronizacion Realtime.
- `src/lib/firebase.ts`: cliente FCM (permiso, token, listener foreground).
- `src/lib/pushNotifications.ts`: registro multi-dispositivo y envio via Edge Function.
- `public/firebase-messaging-sw.js`: service worker para push en background.
- `supabase/functions/send-push/index.ts`: Edge Function que envia via FCM HTTP v1 API.
- `supabase-push-tokens.sql`: migracion de tabla `push_tokens` + RLS.
- `supabase-migration.sql`: esquema inicial.
- `supabase-auth-secure-migration.sql`: migracion segura de Auth y RLS.
- `supabase-auth-trigger-fix.sql`: diagnostico y reparacion del error de triggers en `auth.users`.
- `capacitor.config.ts`: configuracion de Android.

## Seguridad

Las claves enviadas por chat, commits o archivos publicos deben revocarse. Una clave `service_role` permite acceso administrativo completo a la base. Para usuarios finales se usa exclusivamente la `anon key` junto con Supabase Auth y RLS.

Si crear un administrador o guarda devuelve `Database error creating new user`, ejecuta `supabase-auth-trigger-fix.sql` en Supabase SQL Editor. La aplicacion crea el perfil despues de crear el usuario Auth, por lo que un trigger adicional que inserte perfiles puede fallar por columnas obligatorias o duplicar registros.

Proyecto privado para uso interno.
