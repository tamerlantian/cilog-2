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
- **Excepción a la cola de operaciones**: los puntos no pasan por `core/sync`.
  El plugin los guarda en su propia base, los envía en lotes y los reintenta
  aunque JS no esté corriendo. Ver la regla en `docs/offline.md`.
- **Token en dos lados**: el plugin renueva el token por su cuenta (con la app
  cerrada) y avisa con `onAuthorization`; la app lo guarda en la sesión. Cuando
  la app lo renueva, se lo pasa al plugin. Fluor no rota el refresh token.
- **Formato**: el plugin arma cada punto con los nombres de Fluor
  (`locationTemplate`), sin transformarlos en JS. Velocidad en m/s; `-1`
  significa desconocido.

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

- Aviso previo propio antes de pedir el permiso (qué se recoge, para qué,
  cuándo se detiene).
- Guía para quitar la optimización de batería (Xiaomi, Huawei, Oppo, Samsung).
- Indicador en el despacho: "Ubicación activa", "Sin permiso" o "GPS apagado",
  con acción para corregirlo.
- Sin permiso, el despacho funciona igual.

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
