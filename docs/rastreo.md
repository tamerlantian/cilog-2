# Ubicación del conductor en tiempo real

La app reporta la posición del conductor mientras tiene un despacho en curso,
para que la empresa lo vea en el mapa. Se usa
[`react-native-background-geolocation`](https://github.com/transistorsoft/react-native-background-geolocation)
(Transistorsoft, v5, con licencia) porque sigue funcionando con la pantalla
apagada o la app cerrada, ahorra batería con detección de movimiento y guarda y
reintenta los puntos sin señal.

## Decisiones

- **Cuándo se rastrea**: solo con un despacho en curso (vinculado y sin
  terminar). Se detiene al terminarlo, desvincularlo o cerrar sesión. Nunca
  fuera de la jornada (Ley 1581).
- **Un despacho a la vez**: Fluor recibe los puntos por asignación
  (`X-Tenant-Despacho-ID`). Si el conductor tiene varios, se rastrea el que
  tiene abierto o el último que abrió.
- **Sin permiso de segundo plano**: el servicio arranca con la app abierta (el
  conductor entra al despacho), así que basta con `ACCESS_FINE_LOCATION` más
  el foreground service de tipo `location`. `ACCESS_BACKGROUND_LOCATION` se
  quita del manifest y no hace falta la revisión de Play para ubicación en
  segundo plano. Por lo mismo, no se reanuda solo al reiniciar el teléfono
  (`startOnBoot: false`).
- **Servicio siempre abierto (`notification.sticky: true`)**: es lo que hace
  posible la decisión anterior. Sin `sticky`, el plugin cierra el servicio y
  su notificación cada vez que el vehículo queda quieto, y para reanudar
  depende de una geocerca (exige "Siempre") y de abrir el servicio desde
  segundo plano (Android 12+ no lo permite sin `ACCESS_BACKGROUND_LOCATION`).
  Resultado en la prueba en ruta del 13 nov 2026 (Xiaomi, Android 15): 4
  puntos al arrancar y nada más en todo el trayecto. Con el servicio abierto
  el GPS igual se apaga quieto (detección de movimiento), así que el costo en
  batería es bajo.
- **Notificación visible**: en Android 13+ hace falta `POST_NOTIFICATIONS`
  en tiempo de ejecución; sin él Android oculta la notificación aunque el
  servicio corra. Se pide una vez, después del permiso de ubicación
  (`pedirPermisoNotificaciones`). Si lo niega, el rastreo sigue igual.
- **Excepción a la cola de operaciones**: los puntos no pasan por `core/sync`.
  El plugin los guarda en su propia base, los envía en lotes y los reintenta
  aunque JS no esté corriendo. Ver la regla en `docs/offline.md`.
- **Token en dos lados**: el plugin renueva el token por su cuenta (con la app
  cerrada) y avisa con `onAuthorization`; la app lo guarda en la sesión. Cuando
  la app lo renueva, se lo pasa al plugin. Fluor no rota el refresh token.
- **Formato**: el plugin arma cada punto con los nombres de Fluor
  (`locationTemplate`), sin transformarlos en JS. Velocidad en m/s; `-1`
  significa desconocido.

## iOS (15 nov 2026)

iOS no tiene foreground service, así que la decisión de Android ("mientras se
usa" con el servicio fijo) no sirve allí: al quedar quieto el plugin apaga el
GPS, iOS suspende la app y solo una geocerca la despierta, y la geocerca exige
permiso "Siempre". Por eso en iOS se pide **"Siempre"**, con respaldo:

| Permiso en iOS | Qué hace el rastreo | Qué ve el conductor |
|---|---|---|
| Siempre | Detección de paradas normal: quieto apaga el GPS y lo vuelve a encender al salir de la geocerca (~200 m). Si cierra la app, iOS la relanza al moverse. | "Ubicación en vivo para <empresa>" |
| Mientras se usa | Respaldo: GPS encendido todo el despacho (`pausesLocationUpdatesAutomatically: false`, `disableStopDetection: true`). No se corta en las paradas, gasta más batería y **se pierde si cierra la app** hasta que la abra. | "Si cierras Cilog, la empresa deja de verte" → Permitir siempre (Ajustes) |
| Negado | No arranca, como en Android. | "Sin permiso" → Permitir |

- `configuracionSegunPermiso` (`core/rastreo/config.ts`) decide el modo; se
  aplica al iniciar y cada vez que cambia el permiso (`onProviderChange`).
  En Android devuelve null: allí no cambia nada.
- **Diálogos**: iOS muestra primero "Permitir al usar la app" y después
  "Cambiar a Permitir siempre" (una sola vez por instalación). El aviso
  previo lo explica. Después, solo se cambia en Ajustes > Cilog > Ubicación.
- El diálogo propio del plugin (en inglés) va apagado
  (`disableLocationAuthorizationAlert`); la línea del despacho cumple ese
  papel.
- **Movimiento**: iOS pide "Movimiento y actividad física"
  (`NSMotionUsageDescription`). Si lo niega, el plugin usa solo la geocerca.
- **Latido**: en iOS `onHeartbeat` solo corre con `preventSuspend`, que no se
  usa por la batería. Quieto, el mapa muestra el último punto hasta que el
  vehículo se mueva.
- **Sin equivalente en iOS**: notificación fija, `POST_NOTIFICATIONS` y la
  guía de batería por marca (`bateriaSinRestricciones` devuelve true).
- iOS recuerda de vez en cuando al conductor que Cilog usa la ubicación en
  segundo plano (con un mapa). Si lo baja a "mientras se usa", queda en el
  respaldo y la línea lo muestra.
- `Info.plist`: `UIBackgroundModes` (`location`, `fetch`, `processing`),
  `BGTaskSchedulerPermittedIdentifiers` (`com.transistorsoft.fetch`; sin él
  la app se cae al registrar la tarea) y los textos de ubicación y
  movimiento. Licencia: `TSLocationManagerLicense` desde
  `ios/Secretos.xcconfig` (ver `docs/release-appstore.md`).
- **Sin verificar en un iPhone real**: todo lo anterior sale de la
  documentación del plugin. La prueba en ruta debe cubrir "Siempre",
  "Mientras se usa" y app cerrada desde el selector, con paradas de más de
  5 min.

## Contrato

`POST /tte/movil/despacho/ubicacion-lote`. Ver §12 en `docs/contratos-fluor.md`.

| Respuesta | Qué hace la app |
|---|---|
| 2xx | El plugin borra el lote del teléfono. |
| 401 | El plugin renueva el token y reintenta. |
| 409 (despacho cerrado) o 404 (asignación liberada, anulado) | Detener el rastreo y borrar los puntos pendientes: si no, el plugin reintentaría para siempre. |
| Otro | El plugin reintenta en el siguiente envío. |

## Sprints

Cada sprint termina con `npm run validar` en verde y un commit (o PR) propio.

### Sprint 1: base nativa y `core/rastreo` (sin activarse)

**Estado (12 nov 2026)**: hecho, con pruebas. Compila en debug y arranca en el
emulador (`ready()` corre al abrir la app). Release con licencia probado: el
plugin la valida. Fluor ya acepta el refresh del plugin (abajo).

- Instalar `react-native-background-geolocation@5.8.2` exacta.
- Licencia por `manifestPlaceholders` desde `~/.gradle/gradle.properties`
  (`TRANSISTORSOFT_LICENSE`), nunca en el repo. Paso en `docs/release-play.md`.
- Manifest: quitar `ACCESS_BACKGROUND_LOCATION`.
- Ícono monocromo de la notificación (`ic_stat_cilog`).
- `src/core/rastreo/`: configuración, `iniciarRastreo`, `detenerRastreo`,
  cambio de asignación, token en ambos sentidos, manejo de 409/404.
- Conexión con la sesión en `app/` (como `conectarSesionConApi`).
- Mock del plugin en `jest.setup.js` y pruebas de `core/rastreo`.
- Compila en debug y release.

### Sprint 2: integración con despachos y sesión

**Estado (12 nov 2026)**: hecho, con pruebas. Falta probarlo en un teléfono
con un despacho real (permiso nativo, notificación y puntos en Fluor).

- **Arranque**: al abrir un despacho en curso (`useRastrearDespacho` en
  `DespachoPantalla`). Si se rastreaba otro, cambia a este.
- **Parada**: `useVigilarRastreo` (montado en `Pestanas`, vive con la sesión)
  lo detiene cuando su despacho se termina, se desvincula o la empresa lo
  libera. No salta solo a otro despacho: el siguiente arranca al abrirlo.
- **Rechazo de Fluor (404/409)**: aviso al conductor y se actualizan los
  despachos. La asignación queda en `rastreo.rechazadas` (MMKV) para no volver
  a arrancar cada vez que se abre; se olvida al cerrar sesión.
- **Cerrar sesión o eliminar la cuenta** (que cierra la sesión): lo resuelve
  `conectarSesionConRastreo` desde el Sprint 1.
- Regla en `domain/rastreo.ts` (`puedeRastrearse`, `debeDetenerse`).

### Sprint 3: experiencia del conductor

**Estado (12 nov 2026)**: hecho, con pruebas. Diseño elegido en el canvas
*Cilog — dirección visual*, fila "Ubicación en ruta": aviso de la opción A
(hoja) con el indicador de la opción C (línea junto al avance). Falta verlo
en un teléfono real.

- **Compartir es obligatorio** con un despacho en curso: el aviso no tiene
  "Ahora no" y no hay "Dejar de compartir". Atrás de Android sale del
  despacho. Si el conductor niega el permiso de Android, el despacho funciona
  igual y la línea lo muestra.
- **Aviso** (`AvisoUbicacion`, sobre `ui/Hoja`): la primera vez por usuario
  (`rastreo.aviso.<usuario>` en MMKV). "Continuar" pide el permiso; el rastreo
  solo arranca con el permiso concedido, para que Android no repita su diálogo
  cada vez que el conductor vuelve a la app.
- **Línea** (`LineaUbicacion`), del problema más urgente al estado normal
  (`indicadorUbicacion`): sin permiso → Permitir (o los ajustes si quedó
  bloqueado), GPS apagado → Activar, ahorro de batería → Revisar, y si no,
  "Ubicación en vivo para <empresa>". Se relee al volver a la app y cuando
  cambia el permiso o el GPS.
- **Guía de batería** (`GuiaBateria`): pasos por marca (`guiaBateria`) y
  "Abrir ajustes" con los del fabricante del plugin. "Ya lo hice" deja de
  insistir en ese teléfono (`rastreo.bateriaRevisada`). Los nombres de los
  menús se verifican en teléfonos reales en el Sprint 4.
- Pendiente menor: en pruebas queda un aviso de `act` intermitente (cerca de
  1 de cada 10 corridas) por la re-medición diferida de `VirtualizedList`
  cuando cambia la cabecera; no hace fallar nada.

### Sprint 4: Play y prueba en campo

- Declaración del foreground service `location` en Play Console (video).
- Seguridad de los datos y política de privacidad.
- Ruta real de 1–2 h en Xiaomi y Samsung: pantalla apagada, sin señal, app
  cerrada desde recientes. Medir batería y frecuencia de puntos.
- Calibrar `distanceFilter`, `stopTimeout` y lote.
- Salida gradual: pruebas internas → 20 % → 100 %.

### Sprint 5 (opcional): una sola librería de GPS

- `obtenerUbicacion()` pasa a `BackgroundGeolocation.getCurrentPosition` y se
  retira `@react-native-community/geolocation`.

## Refresh desde el plugin: **resuelto en Fluor** (`c1c1818`)

El plugin renueva el token con un POST de formulario (`refresh_token=…`) y el
`Authorization` con el access token vencido. Fluor ahora lee el refresh token
de JSON (app), formulario (plugin) o cookie (web), responde JSON a los dos
primeros y limita a 10/min por usuario (no por IP, por el CGNAT de los
operadores). Probado con las pruebas de Fluor más multipart, urlencoded y
formulario sin el campo (401).

## Para tener en cuenta

- El plugin agrega `ACTIVITY_RECOGNITION` (detección de movimiento): Android
  pide también el permiso de "Actividad física". El aviso previo del Sprint 3
  debe mencionarlo.
- También agrega `SCHEDULE_EXACT_ALARM` y `RECEIVE_BOOT_COMPLETED`. No usamos
  horarios ni arranque al reiniciar; revisar en el Sprint 4 si Play pide
  declararlos y, si estorban, quitarlos con `tools:node="remove"`.
