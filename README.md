# Residex

Sistema SaaS integral de gestión residencial multi-tenant (multi-conjunto)
como **PWA instalable** en celulares y desktop.
Stack: **React + Vite** (frontend), **Supabase** (PostgreSQL + Auth + RLS + Realtime),
**Firebase Cloud Messaging (FCM)** (notificaciones push estilo WhatsApp) y
**Service Worker** (notificaciones en segundo plano).

---

## 🌐 URLs Públicas

- **PWA + Web**: <https://conjuntos-app-pwa.vercel.app>

---

## 🏗️ Arquitectura

### Una misma base de datos

| Cliente | Cómo funciona | Actualizaciones automáticas |
|---------|---------------|------------------------------|
| **PWA / Web** (Chrome / Safari / Edge) | Frontend React + Service Worker. Conexión directa a Supabase con `VITE_SUPABASE_ANON_KEY`. | **Sí**, por `serviceWorker` + despliegue Vercel. |
| **Backend Express (opcional)** | `server.ts` con rutas de negocio y WebSocket. Útil si necesitas validaciones que no quieres en Edge Functions. | Despliegue por separado en Render u otro hosting. |

### Reglas de seguridad (IMPORTANTE)

- **NUNCA pongas `SUPABASE_SERVICE_ROLE_KEY` en código del frontend / `dist`.**
- **Solo el `VITE_SUPABASE_ANON_KEY` va en el cliente.**
- Las validaciones sensibles (límites de planes, aprobación de pagos, auditoría) deben hacerse en **Edge Functions de Supabase** (recomendado) o en el backend Express (con `SUPABASE_SERVICE_ROLE_KEY`).
- RLS (Row Level Security) está en `supabase-auth-secure-migration.sql`.

### Diagrama de una notificación push

```
  Evento en Supabase (anuncio/reserva/incidente/visita)
            │
            ▼
  DataContext.jsx detecta Realtime INSERT/UPDATE
            │
            ├──► insertNotification() → tabla notifications (historial en BD)
            │
            ▼
  sendPushToMany(userId[]) / sendPushToUser(userId)   (pushNotifications.ts)
            │
            ▼ (POST /api/send-push con { tokens, notification, data })
  Serverless Vercel  api/send-push.ts
  (firebase-admin, payload webpush: Urgency high, silent false, link absoluto)
            │
            ▼
  FCM HTTP v1 API ──► tokens de push_tokens + profiles.fcm_token
            │
      ┌─────┴──────────────────────────────────────┐
      ▼                                            ▼
  Service Worker FCM (background/cerrada)    onMessage (primer plano)
  firebase-messaging-sw.js v5:               firebase.ts + pushNotifications.ts:
  onBackgroundMessage + listener push        beep + vibración + showNotification
  showNotification() con sonido+vibración    + banner toast en la UI
  (barra superior, heads-up)                 + Badging API (contador del ícono)
```

---

## 👥 Roles y permisos (resumen)

| Rol | Acceso | Vistas |
|-----|--------|--------|
| **Super Admin** | Toda la plataforma SaaS: conjuntos, planes, administradores, presencia global, auditoría. | Panel Principal, Conjuntos, Administradores, Usuarios y Purga, Suscripciones, Guía |
| **Admin / Administrador** | **Solo SU conjunto**: residentes, apartamentos, guardas, anuncios, incidencias, reservas, visitantes, auditoría, reportes, suscripción. | Dashboard, Pendientes, Apartamentos, Residentes, Anuncios, Incidencias, Reservas, Visitas, Guardas, Auditorías, Reportes, Mi Suscripción, Guía |
| **Resident / Residente** | **Solo SU apartamento**: sus reservas, sus pases de visita, reportar incidencias, ver anuncios. | Dashboard, Mi Apartamento, Anuncios, Visitantes, Reservas, Incidentes, Guía |
| **Guard / Guarda** | Control de acceso de **SU conjunto**: validar códigos de visitante, ingresos/salidas, directorio. | Portería, Validador, Directorio, Guía |

> El aislamiento entre conjuntos lo impone **RLS en Supabase** (`supabase-auth-secure-migration.sql` + `supabase-rls-superadmin-fix.sql`):
> cada consulta filtra por `complex_id` del perfil, excepto `super_admin` que ve todo.

---

## 🛡️ Rol Administrador (Admin) — guía detallada

El administrador gestiona **un solo conjunto**. Todo lo que crea, aprueba o ve está filtrado por su `complex_id`. Al entrar ve el **Dashboard** con banner del plan (PRO SaaS + código del conjunto), botones "Nuevo Aviso" y "Gestionar Unidades".

### 1. Dashboard (`admin_dashboard`)

- **4 tarjetas de métricas**: Residentes Activos, Ocupación de Unidades (`ocupados / total`), Pases de Visitantes, Incidencias Abiertas. Cada tarjeta es clicable y navega a su vista.
- **Acciones rápidas** (8 accesos directos con contador): Aprobar Residentes (con badge de nuevas), Publicar Comunicado, Reservas de Zonas, Incidencias y Reportes, Gestión de Apartamentos, Personal de Portería, Bitácora de Visitas, Reportes y Métricas.
- **Residentes Pendientes de Aprobación**: lista con foto facial, nombre, unidad y email + botón **Aprobar** directo.
- **Últimos Comunicados de la Administración**: vista previa en tiempo real con comentarios.

### 2. Pendientes (`admin_pending`) — Aprobación de Solicitudes de Residentes

- Bandeja de solicitudes con **fotografía facial**, nombre, email, apartamento y teléfono.
- Flujo: el residente se registra con el **código del conjunto** → queda en estado `pending` → el admin verifica identidad y foto → **Aprobar** (pasa a `active`) o rechazar/bloquear.
- Estado vacío: "Bandeja de solicitudes al día". Modal **"Confirmar Aprobación de Residente"** antes de autorizar.

### 3. Apartamentos (`admin_apartments`) — Gestión de Apartamentos

- Inventario de unidades habitacionales: número, piso, estado (`available` / `occupied`), residente asignado.
- **Crear Nuevo Apartamento** (modal): número, piso, estado inicial.
- **Asignar Residente a Apartamento** (modal): vincula residente ↔ unidad y marca la unidad como ocupada.
- Respeta el **límite del plan** (Free: 50, Pro: 200). Si se supera, alerta "Límite alcanzado".

### 4. Residentes (`admin_residents`) — Directorio de Residentes

- Lista de **residentes activos** del conjunto con foto, nombre, apartamento, teléfono.
- Buscador por nombre/correo/apartamento. Ficha por residente (hover con detalle).
- Acciones: cambiar estado, desvincular apartamento.

### 5. Anuncios (`admin_announcements`) — Comunicados

- **Publica avisos oficiales** con título + contenido (modal "Nuevo Comunicado Oficial").
- Cada comunicado admite **comentarios en vivo** (Realtime) de los residentes.
- Al publicar, el sistema automáticamente: inserta notificación en BD a cada residente del conjunto **y** envía **push FCM a todos sus dispositivos** (`sendPushToMany`).
- Listado con fecha, autor y contador de comentarios. Eliminar comunicado borra también sus comentarios.

### 6. Incidencias (`admin_incidents`) — Incidencias y Reportes

- Bandeja de incidencias reportadas por residentes: título, descripción, **prioridad** (`medium`/`high`/etc.), estado (`open` → `in_progress` → `closed`), reportante y apartamento, fecha.
- **Filtros por estado**. Cambiar estado notifica al reportante por **push** ("🔄 Incidencia Actualizada").
- Al crear un residente una incidencia, los **admins reciben push** "🚨 Nueva Incidencia Reportada" automáticamente.

### 7. Reservas (`admin_reservations`) — Reservas de Zonas Comunes

- Solicitudes de áreas comunes (quincho, piscina, salón): área, fecha, hora inicio/fin, residente, apartamento, estado (`pending`/`approved`/`rejected`).
- **Aprobar / Rechazar** con un tap → el residente recibe **push** ("✅ Reserva Aprobada" / "❌ Reserva Rechazada") y notificación en BD.
- Filtros por estado. Respeta límite de áreas del plan.

### 8. Visitas (`admin_visitors`) — Bitácora de Visitas

- **Registro completo de ingresos y salidas**: código del pase (`VIS-XXXX`), nombre del visitante, motivo, apartamento destino, residente anfitrión, estado (`registered` → `in` → `out`), horas de entrada/salida.
- Cuando un guarda registra ingreso/salida, el residente recibe **push** ("✅ Visitante Ingresó" / "🚪 Visitante Salió").
- Historial filtrable y auditable.

### 9. Guardas (`admin_guards`) — Personal de Portería

- Gestión de guardas de seguridad autorizados para el control de acceso.
- **Agregar Guarda de Seguridad** (modal): crea el usuario Auth + perfil con rol `guard` vía Edge Function `guard-create`. Al crearse se muestra modal **"Guarda Creado Exitosamente"** con la credencial temporal.
- Límite del plan (Free: 2, Pro: 5). Eliminar guarda libera el cupo.

### 10. Auditorías (`admin_audits`) — Registro de Auditoría

- **Historial completo de acciones** del conjunto: quién hizo qué, cuándo (`audit_logs` en tiempo real).
- Útil para trazabilidad: aprobaciones, cambios de estado, eliminaciones, purgas.

### 11. Reportes (`admin_reports`) — Reportes y Métricas

- **4 métricas**: Total Residentes, Apartamentos Ocupados, Visitas Este Mes, Incidencias Resueltas.
- **Distribución de Métricas**: comparativa visual de los indicadores del conjunto.
- Acceso a generación de reportes (según plan).

### 12. Mi Suscripción (`admin_billing`) — Plan y facturación

- **Solo lectura**: plan actual, estado, fecha de vencimiento y días restantes.
- Barras de **uso vs. límite** del plan (apartamentos, guardas, áreas comunes).
- Código del conjunto para compartir con residentes.
- Los pagos se coordinan con el Super Admin desde **Soporte** (pasarela en línea próximamente).

### 13. Guía (`app_guide`)

- Manual interactivo por secciones: Panel Principal, Gestión de Residentes, Comunicaciones, Seguridad y Auditoría. Ideal para capacitar nuevos administradores.

---

## 🏠 Rol Residente — guía detallada

El residente **solo ve su apartamento y sus propios trámites**. Al entrar ve "Bienvenido, {nombre}" + su apartamento, 4 tarjetas (Visitantes Activos, Reservas Pendientes, Incidencias Abiertas, Comunicados), **Acciones Rápidas** y **Mis Visitantes Recientes**.

### 1. Dashboard (`resident_dashboard`)

- Tarjetas con sus contadores personales + accesos directos: **Generar Pase de Visitante**, **Reservar Área Común**, **Reportar Incidente**, **Ver Comunicados**.

### 2. Mi Apartamento (`resident_apartment`)

- **Datos del Apartamento**: número, piso, estado, conjunto.
- **Datos del Residente**: nombre, email, teléfono, foto.

### 3. Anuncios (`resident_announcements`) — Comunicados

- Avisos de la administración **en tiempo real**, con lectura y **comentarios** (el autor del comunicado recibe notificación del comentario).
- Al publicarse un comunicado nuevo, llega **push** "📢 Nuevo Comunicado" aunque la app esté cerrada.

### 4. Visitantes (`resident_visitors`) — Pases de Visitante

- **Genera códigos únicos** (`VIS-XXXX`, modal) con nombre del visitante, motivo y apartamento destino.
- Comparte el código con tu visita; el guarda lo valida en portería.
- Ve el estado de cada pase (`registered`/`in`/`out`) y recibe **push** cuando el visitante ingresa o sale.

### 5. Reservas (`resident_reservations`) — Mis Reservas

- **Reserva áreas comunes**: área, fecha, hora inicio/fin (modal). El sistema **bloquea horarios traslapados** ("Ese horario ya está ocupado").
- Ve el estado de cada solicitud y recibe **push** al aprobarse o rechazarse.

### 6. Incidentes (`resident_incidents`) — Reportar Incidente

- **Notifica un problema** del conjunto: título, descripción, prioridad, fotos adjuntas (opcional).
- El administrador lo recibe al instante por push y te avisa cada cambio de estado.

---

## 🛂 Rol Guarda de Seguridad — guía detallada

El guarda opera el **control de acceso físico** del conjunto desde su celular.

### 1. Portería (`guard_dashboard`)

- Panel de control con resumen del turno.
- **Verificador de Código**: ingresa el código del visitante (`VIS-XXXX`) para validar su acceso al instante.
- **Visitantes Esperados**: lista de pases `registered`; botón **Ingreso** cuando llega la persona.
- **Dentro del Conjunto**: lista de visitantes con estado `in`; botón para **Registrar salida**.
- **Historial de Hoy**: entradas y salidas registradas en el turno.
- **Comunicados**: avisos del conjunto para el personal.
- **Cambiar Contraseña** desde su panel.

### 2. Validador (`guard_validator`) — Control de Acceso

- **Ingresar Código de Visitante** (teclado en pantalla) → muestra **Información del Visitante** (nombre, destino, residente anfitrión, estado) → valida ingreso/salida.
- **Visitantes Esperados**: conteo de registrados pendientes.
- **Historial de Validaciones**: últimas acciones de la sesión (auditable).

### 3. Directorio (`guard_directory`) — Directorio Telefónico

- Lista de residentes del conjunto con **información de contacto** (apartamento, teléfono) para ubicar al anfitrión ante una visita.

> Cada ingreso/salida que registra el guarda dispara **push automática al residente anfitrión** y queda en la bitácora del admin.

---

## 🚀 Inicio rápido (desarrollo local)

### Requisitos

- Node.js **20+**
- [Supabase CLI](https://supabase.com/docs/guides/cli) (opcional, para desplegar Edge Functions)
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
| `supabase-presence-usage.sql` | Crea la tabla `usage_log` (uso diario por usuario/conjunto) + RLS. | 1 vez, antes de ver "Uso diario". |
| `supabase-consentimiento.sql` | Agrega `consentido` + `consentido_at` a `profiles` (LOPDP Ecuador). | 1 vez, antes de registrar usuarios. |
| `supabase-app-errors.sql` | Crea la tabla `app_errors` (monitoreo self-hosted) + RLS. | 1 vez, antes de usar el visor de errores. |
| `supabase-auth-trigger-fix.sql` | Repara triggers duplicados de `auth.users` que rompen el alta de usuarios. | Si `admin-create` o `guard-create` fallan con *Database error*. |

### Orden obligatorio de migración

```sql
-- 1. En SQL Editor (Supabase)
supabase-migration.sql            → ejecutar
supabase-auth-secure-migration.sql → ejecutar
supabase-push-tokens.sql          → ejecutar
supabase-presence-usage.sql       → ejecutar
supabase-consentimiento.sql       → ejecutar
supabase-app-errors.sql           → ejecutar
-- (solo si falla el alta) supabase-auth-trigger-fix.sql
```

### Tablas principales

```
residential_complexes ──► apartments ──► residents_in_apartments
            │                  │
            ▼                  ▼
      profiles (users)   bookings / reservations
      (+consentido)      │
            │
  announcements ──► announcement_comments
  incidents      visitors        audit_logs
  notifications  push_tokens    usage_log (uso diario)
  app_errors (monitoreo)
```

---

## 👑 Rol Super Admin — guía detallada

El super admin ve **toda la plataforma SaaS** (todos los conjuntos). Su dashboard es la **Consola SaaS** con banner "Plataforma Global" y botones "Exportar Informe PDF" + "Nuevo Conjunto".

### 1. Panel Principal (`super_dashboard`)

- **4 tarjetas**: Conjuntos Activos (`activos / total`), Administradores, Ingreso Estimado (facturación mensual en COP), Usuarios Totales (con subtítulo en vivo: `X en línea · Y desconectados`).
- **Presencia en Tiempo Real** (ver sección dedicada abajo): conectados/desconectados **por conjunto** + uso diario.
- **Acciones rápidas**: Crear Conjunto Residencial, Crear Cuenta de Administrador, Gestionar Suscripciones, Auditoría y Purga de Cuentas.
- **Conjuntos Residenciales Recientes**: nombre, código, dirección, badge de plan (`FREE`/`PRO`/`ENTERPRISE`) y estado (`Activo`/`Bloqueado`).
- **Auditoría de Seguridad en Vivo**: eventos críticos del sistema con indicador "WebSocket Sync".

### 2. Conjuntos (`super_complexes`) — Conjuntos Residenciales

- Administra condominios: nombre, dirección, **código de acceso** (el que usan los residentes para registrarse, con botón **Copiar código**), plan, estado.
- **Registrar Nuevo Conjunto Residencial** (modal): crea el conjunto y su código único.
- Activar/bloquear conjuntos, cambiar plan, extender suscripción.

### 3. Administradores (`super_admins`)

- Cuentas con administración delegada por conjunto.
- **Crear Administrador de Conjunto** (modal, vía Edge Function `admin-create`): asigna un admin a un conjunto específico.

### 4. Usuarios (`super_users`) — Gestión Global de Usuarios y Purga

- Tabla global con **buscador** (nombre/correo/apartamento) y **filtro por rol** (`all`/`super_admin`/`admin`/`resident`/`guard`).
- Columnas: Usuario (avatar + email), Rol (badge), Conjunto Asignado (nombre + código), Unidad/Teléfono, Estado (`active`/`pending`/`blocked`).
- **Purga en Cascada** (botón rojo, con confirmación): elimina permanentemente al usuario + sus visitas, reservas, comentarios y notificaciones, libera su apartamento y **emite certificado PDF de auditoría**. Los `super_admin` aparecen como "Protegido".

### 5. Suscripciones (`super_subscriptions`) — Gestión de Planes y Suscripciones SaaS

- Administra planes tarifarios, estado de facturación mensual y vigencia por conjunto.
- **Estado de Suscripciones por Conjunto**: control de vigencia, cobros y **extensiones de 30 días**.
- Cambiar plan (`free`/`pro`/`enterprise`), marcar pagado, bloquear por mora.

---

## 🟢 Presencia en Tiempo Real y Uso Diario (solo Super Admin)

### Cómo funciona

- Cada usuario logueado se registra en el canal Realtime **`presence-online-v1`** (`DataContext.jsx`) con su `{ id, name, role, complex_id, online_at }`. Al cerrar la app/pestaña, Supabase detecta la desconexión y el panel se actualiza solo (~10–30 s).
- Al conectarse, el cliente registra **1 sesión del día** en la tabla **`usage_log`** (una fila por `auth_user_id + day`, con `sessions` y `last_seen`). Requiere haber ejecutado `supabase-presence-usage.sql`.
- Solo el `super_admin` **lee** el estado de presencia y `usage_log`; los demás roles solo publican su presencia (no ven a nadie).

### Lo que ve el Super Admin

1. **Resumen global** (4 tarjetas): Conectados, Desconectados, Dispositivos (sesiones activas: PC + celular cuentan por separado) y **Uso hoy `X/Y`** (usuarios distintos que abrieron la app hoy).
2. **Filtro por conjunto** (pills): `Todos` + cada conjunto con su contador verde de en línea.
3. **Vista "Todos"**:
   - **Uso diario · últimos 7 días**: barras por día con conteo de usuarios distintos.
   - **Mini-cards por conjunto**: nombre, código, en línea ahora, barra **"Uso hoy X/Y · Z%"**, desconectados y "Ver detalle".
4. **Detalle por conjunto**: nombre + plan, barra de uso hoy, strip de 7 días del conjunto, lista de **Conectados ahora** (avatar con punto verde, rol, "hace X min", nº de dispositivos) y lista de **Desconectados** (nombre, unidad/rol).

---

## 💳 Planes y límites SaaS

| Límite | Free (Gratuito) | Pro | Enterprise |
|--------|-----------------|-----|------------|
| Apartamentos | 50 | 200 | 9999 |
| Guardas | 2 | 5 | 999 |
| Áreas comunes | 1 | 5 | 999 |
| Ingreso estimado ref. | — | $30 USD / $120k COP | $100 USD / $400k COP |

- Los límites se validan en la app (`checkResourceLimit` en `DataContext.jsx`); al superarlos se muestra alerta "Límite alcanzado".
- El tema visual cambia por plan: Free = claro (verde), Pro = oscuro (cyan), Enterprise = oscuro (violeta).
- Si el plan **vence o el conjunto se bloquea**, los usuarios no-admin ven pantalla de "Suscripción Vencida / Conjunto Bloqueado".
- El **admin del conjunto** ve su plan, vencimiento y uso de límites en **Mi Suscripción** (`admin_billing`), y coordina pagos con el Super Admin desde **Soporte**.

---

## 🏭 Producción (checklist para conjuntos reales)

### 1. Setup inicial del primer cliente
- Si no existe ningún super admin activo, la app muestra el **asistente de configuración** (crear super admin → crear primer conjunto, plan Free 30 días).
- Requiere desplegar la Edge Function: `supabase functions deploy bootstrap-setup`.
- La función solo funciona con la BD vacía de super admins (seguro por diseño).

### 2. Legal Ecuador (LOPDP)
- **Política de Privacidad** y **Términos y Condiciones** visibles en login y sidebar (`src/components/legal/LegalModal.jsx`).
- Checkbox de **consentimiento obligatorio** en ambos registros de residente; se guarda `consentido` + `consentido_at` en `profiles` (requiere `supabase-consentimiento.sql`).
- Contacto del responsable: `privacidad@residex.app` / `soporte@residex.app` (actualizar con datos reales).

### 3. Monitoreo self-hosted (sin Sentry)
- Errores JS globales → tabla `app_errors` (`src/lib/errorLog.js`, requiere `supabase-app-errors.sql`).
- `ErrorBoundary` con pantalla elegante + botón **Reportar**.
- El super admin revisa los últimos 10 errores en su dashboard (tarjeta **Errores de la App**).

### 4. Soporte al super admin
- Botón **Soporte** en el sidebar: muestra email/teléfono de super admins y admin del conjunto, y permite enviarles un mensaje (crea notificación `type: 'support'`).

### 5. Rendimiento
- Vistas por rol con `React.lazy()` + chunks `views-{super,admin,resident,guard}` (`vite.config.js` → `manualChunks`). `jspdf`/`html2canvas` solo cargan con la Guía/Reportes.

### 6. Offline parcial
- Últimos 20 comunicados cacheados en `localStorage` (`src/lib/offlineCache.js`); banner ámbar global sin conexión; fallback de lectura en Comunicados del residente (sin comentarios offline).

### 7. Seguridad post-deploy
- **Rotar** `SUPABASE_SERVICE_ROLE_KEY` si alguna vez se expuso, y cambiar la contraseña del super admin creado en pruebas.
- Verificar que `dist/` no contenga `SUPABASE_SERVICE_ROLE_KEY` ni claves privadas.

---

## 🔔 Notificaciones push (Estilo WhatsApp)

El objetivo: que llegue en **primer plano, segundo plano y con la APP TOTALMENTE CERRADA**, exactamente igual que WhatsApp.

### ¿Cómo se consigue?

La clave está en **2 ajustes combinados**:

1. **El mensaje FCM enviado por el servidor (Edge Function) debe tener `priority: high`.**
   Android en modo Doze (ahorro de batería) POSTERGA los mensajes `priority: normal` hasta que el celular se despierte.
   Con `priority: high`, FCM despierta al teléfono y entrega el mensaje inmediatamente.

2. **El Service Worker (PWA) con `onBackgroundMessage`** muestra la notificación en background
   con `silent: false` (sonido del sistema) y `vibrate`.

### 1. Configurar Firebase (una vez)

1. Firebase Console → **Create project** (o usa uno existente).
2. Project Settings → **Your apps → Add app → Web app** → copia la config a tu `.env`.
3. Project Settings → **Cloud Messaging**:
   - Habilitar **Firebase Cloud Messaging API (V1)** (este es el que usa la Edge Function).
   - Genera **Web Push certificates (Key pair)** → copia la *key* a `VITE_FIREBASE_VAPID_KEY`.
4. Project Settings → **Service accounts → Generate new private key** (JSON).
   De este JSON, crea **3 variables en Vercel** (Dashboard → Settings → Environment Variables,
   entorno **Production**) porque `api/send-push.ts` corre como serverless en Vercel:
   ```
   FIREBASE_PROJECT_ID   = tu-project-id
   FIREBASE_CLIENT_EMAIL = firebase-adminsdk@...iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY  = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
   > ⚠️ `FIREBASE_PRIVATE_KEY` debe ir como **Sensitive**; las `VITE_*` como **Non-sensitive**
   > (si una `VITE_*` queda Sensitive, el build de Vercel falla).

### 2. Desplegar `send-push` (serverless en Vercel)

Cada vez que modifiques `api/send-push.ts`, basta con el deploy web:

```powershell
npm run build
npx vercel --prod --yes
```

> ⚠️ Sin este paso, las push seguirán enviándose con el payload anterior.

### 3. Flujo en el cliente (PWA)

1. Usuario inicia sesión.
2. **~3 segundos después se dispara el auto-prompt estilo WhatsApp**
   (si la plataforma lo permite). Chrome abre el diálogo del navegador.
3. Si el usuario *no* acepta, se muestra un **banner verde "Recibe notificaciones · Activar"**
   (y botón idéntico en el sidebar). Este banner *depende de ESTE dispositivo*, no del perfil global.
4. Al aceptar:
   - Se llama a `getToken()` de FCM con el **Service Worker registrado** (`firebase-messaging-sw.js`).
   - El token se guarda en la tabla `push_tokens` con `device_label` (`pwa-instalada`, `pc`, etc.).
   - Un usuario puede tener **múltiples tokens activos** (celular + PC + tablet). Los envíos van a TODOS.

### 4. Archivos clave de push

| Ubicación | Qué hace |
|-----------|----------|
| [src/lib/pushNotifications.ts](src/lib/pushNotifications.ts) | Orquesta registro multi-dispositivo, guarda token en Supabase, envía `send-push`. |
| [src/lib/firebase.ts](src/lib/firebase.ts) | Cliente FCM web: `getToken`, `requestPushPermission`, `onMessage` (foreground). |
| [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js) | **Service Worker FCM** → `onBackgroundMessage` (PWA app cerrada / 2do plano). Muestra notificación + abre URL correcta al tocar. |
| [src/lib/badge.ts](src/lib/badge.ts) | Badging API (`navigator.setAppBadge`) para el contador del ícono en Chrome/Edge. |
| [api/send-push.ts](api/send-push.ts) | Serverless Vercel con `firebase-admin`: envía FCM con `webpush.headers.Urgency: high`, `silent: false`, `vibrate`, `fcmOptions.link` absoluto. Limpia tokens inválidos de `push_tokens`/`profiles`. |

### 5. Probar push paso a paso

1. Despliega la PWA en Vercel (`npm run build` + `npx vercel --prod --yes`).
2. Instala / abre la PWA en tu celular **(Chrome Android)**.
3. Inicia sesión → acepta el permiso (auto-prompt a los ~3 s, o banner/botón **Activar**).
4. Abre el **sidebar lateral** → **Notificaciones activas**. Verifica que aparezca tu token en Supabase (tabla `push_tokens`).
5. En Supabase, tabla `push_tokens`, verifica que exista un registro para ese usuario.
6. **Cierra TOTALMENTE Chrome / la PWA** (deslízala de recientes).
7. Desde otro dispositivo (PC) o sesión incógnita → crea una nueva reserva o anuncio para generar una push de prueba.
8. ✅ Debe llegar en la barra superior del celular aunque la app esté cerrada.

> **Nota PWA:** si el sistema operativo mata totalmente el proceso del navegador,
> la entrega depende del soporte Web Push del SO/navegador. En background
> (pestaña minimizada, app no enfocada) llega de forma fiable.

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
supabase functions deploy admin-create
supabase functions deploy guard-create
supabase functions deploy bootstrap-setup
```

`admin-create` y `guard-create` usan `service_role` para crear usuarios Auth directamente
y luego insertar perfil. Son endpoints seguros (no permiten creación anónima).
`bootstrap-setup` solo funciona si no hay super admins (setup inicial, seguro por diseño).

> `send-push` **ya no es Edge Function**: vive en `api/send-push.ts` y se despliega
> automáticamente con `npx vercel --prod --yes`.

### 3. Backend Express en Render (opcional)

Si quieres las rutas de `server.ts` hosteadas 24/7 sin tu PC encendida:

1. Render → **New → Blueprint** → selecciona tu repo. Detecta `render.yaml`.
2. Variables Render Dashboard (Environment) → agrega `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
3. Espera a que `/api/health` responda `200`.
4. Copia la URL de Render a tu `.env` / Vercel como:
   ```
   VITE_API_BASE_URL=https://conjuntos-backend.onrender.com
   VITE_WS_BASE_URL=wss://conjuntos-backend.onrender.com
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
- [ ] Crear anuncio/reserva llega a la barra superior del dispositivo (push)
- [ ] App totalmente cerrada, push llega (background)
- [ ] Responsive 360px (celular antiguo): sin overflow horizontal de página; tablas scrollean internas
- [ ] En `dist/` NO aparece la palabra `SUPABASE_SERVICE_ROLE_KEY`

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

### ❌ Al intentar crear un Admin / Guarda, aparece *Database error creating new user*.

Ejecuta **`supabase-auth-trigger-fix.sql`** en el SQL Editor de Supabase.
Un trigger auto-creado por extensiones intenta insertar `profiles` y rompe el alta
(la app ya inserta `profiles` en el Edge Function después de crear `auth.users`).

### ❌ La push de anuncio/reserva no llega al celular.

Abre **DevTools (F12) → Network → Filtra `send-push`**:
- Status 500 → tu Edge Function tiene error. Mira logs de Edge Function en Supabase Dashboard.
  Causas frecuentes: `FIREBASE_PRIVATE_KEY` sin saltos `\n`, API FCM no habilitada en Google Cloud.
- Status 401 → falta `Authorization: Bearer ANON_KEY` (el frontend lo pasa automáticamente).
- Status 200 pero no llega → ver tabla `push_tokens`: no hay token → permiso no otorgado en ese dispositivo.

### ❌ La PWA al abrirla no pide permiso automáticamente.

Esperalo **3 segundos** después del login. Si se rechazó una vez, el navegador ya no muestra el diálogo.
En ese caso:
- Chrome Android → candado en la barra de direcciones → Permisos → Notificaciones → **Permitir**.
- Luego recarga la PWA (cerrar y abrir).

---

## 🛡️ Seguridad (IMPORTANTE)

- **Jamás compartas / comitees** `.env`, `.env.local`, `service-account.json`.
- Todos están en `.gitignore`.
- Las credenciales de ejemplo (`admin@residex.app`, `cambiar-esta-clave`) **no son cuentas reales**: crea tu super admin desde el setup inicial y usa contraseña fuerte.
- Si `SUPABASE_SERVICE_ROLE_KEY` se llegó a filtrar, **revócala ya mismo**
  (Supabase Dashboard → Project Settings → API → Service Role → Rotate)
  y cambia la contraseña del super admin creado en pruebas.
- Ante duda: nunca uses `USING (true)` / `WITH CHECK (true)` en políticas de tablas con datos reales.
  Las plantillas viejas que permitían eso deben ser **sobrescritas con `supabase-auth-secure-migration.sql`**.

---

## 📁 Estructura rápida del proyecto

```
residex/
├─ index.html                       # Título Residex, manifest, íconos PNG, font Plus Jakarta Sans
├─ package.json
├─ vite.config.js                   # manualChunks por rol (views-*) + vendor-pdf/sql/firebase
├─ vercel.json                      # Headers SW/manifest + rewrites /api e index.html
├─ api/
│  └─ send-push.ts                  # Serverless Vercel: FCM web push (Urgency high, silent false)
├─ src/
│  ├─ App.jsx                       # Rutas por rol (lazy) + banner foreground + SetupGate
│  ├─ main.jsx                      # Mount React + registerPwa() + ErrorBoundary + error handlers
│  ├─ pwa.js                        # Registro único del SW + keep-alive Android + cleanup
│  ├─ index.css                     # Design system (brand-*, surface-*, radius-*, animaciones)
│  ├─ types.js                      # PLAN_LIMITS (free/pro/enterprise)
│  ├─ context/
│  │  ├─ AuthContext.jsx            # Sesión, perfil (+auth_user_id), complejo actual
│  │  └─ DataContext.jsx            # CRUD, Realtime, triggers push, presencia, badge, cache offline
│  ├─ lib/
│  │  ├─ firebase.ts                # FCM web: getToken, requestPushPermission, onMessage
│  │  ├─ pushNotifications.ts       # Auto-prompt 2.8s, multi-device, send-push, debug
│  │  ├─ badge.ts                   # Badging API (navigator.setAppBadge)
│  │  ├─ sound.js                   # Beeps + vibración (triggerHaptic)
│  │  ├─ appNotifications.js        # notifyWhenHidden (fallback)
│  │  ├─ errorLog.js                # logError() + handlers globales → app_errors
│  │  ├─ offlineCache.js            # Cache comunicados + useOnlineStatus()
│  │  ├─ supabaseClient.js          # Browser Supabase client (solo env vars)
│  │  ├─ supabaseRepo.js            # Lecturas Supabase (login, bootstrap, consentido)
│  │  └─ config.js                  # isStandalone, getApiBaseUrl, getWsBaseUrl
│  └─ components/
│     ├─ layout/ AppLayout.jsx      # Sidebar, topbar, bottom nav, banners push/offline, Soporte
│     ├─ layout/ GuestLayout.jsx    # Login/registro + consentimiento LOPDP + links legales
│     ├─ layout/ SetupWizard.jsx    # Setup inicial (super admin + primer conjunto)
│     ├─ legal/ LegalModal.jsx      # Política de Privacidad + Términos (Ecuador)
│     ├─ ui/ Button, Card, Input, Modal, Badge, StatCard, PageHeader, QuickActions,
│     │      ErrorBoundary, SupportModal, NotificationsView…
│     └─ views/
│        ├─ super/ SuperAdminDashboard (+presencia, uso diario, errores), ComplexesView,
│        │         AdminsView, SuperUsersView, SubscriptionsView
│        ├─ admin/ AdminDashboard, PendingResidentsView, ApartmentsView, ResidentsDirectoryView,
│        │         AnnouncementsView, IncidentsView, ReservationsView, VisitorsLogView,
│        │         GuardsView, AuditsView, ReportsView, BillingView (Mi Suscripción)
│        ├─ resident/ ResidentDashboard, MyApartmentView, ResidentAnnouncementsView (+offline),
│        │           ResidentVisitorsView, ResidentReservationsView, ReportIncidentView
│        ├─ guard/ GuardDashboard, GuardVisitorValidatorView, GuardDirectoryView
│        └─ shared/ GuideView.tsx   # Manual interactivo por rol
├─ public/
│  ├─ manifest.webmanifest          # Residex, íconos PNG, shortcuts, display standalone
│  ├─ firebase-messaging-sw.js      # SW FCM v5: onBackgroundMessage + push + click
│  └─ icons/ icon-192.png, icon-512.png, apple-touch-icon.png (logo casa/piscina)
├─ supabase/
│  └─ functions/
│     ├─ admin-create/index.ts
│     ├─ guard-create/index.ts
│     └─ bootstrap-setup/index.ts   # Setup inicial (solo BD sin super admins)
├─ *.sql (migraciones: migration, auth-secure, push-tokens, presence-usage,
│         consentimiento, app-errors…)
└─ README.md (este archivo)
```

---

## 🤖 Guía rápida para seguir trabajando con una IA

1. Primero lee `package.json`, `src/lib/*`, `src/context/*`.
2. Cualquier cambio (React/CSS/lógica) se publica con **build web** + deploy Vercel.
3. Si toca notificaciones: ejecuta **build web** + deploy Vercel.
4. Nunca incluyas `service_role` en JS del frontend.
5. Después de cada cambio importante → `npm run build` exitoso es la 1ª prueba.

Proyecto de uso interno / privado.
