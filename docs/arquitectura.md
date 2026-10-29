# Arquitectura

Organización por *features* con capas. Una capa solo conoce la de abajo, y ESLint lo hace cumplir (`no-restricted-imports`).

```
src/
  app/        arranque: providers y navegación raíz
  features/   un directorio por módulo de negocio (auth, despachos, guias, ...)
    <feature>/
      index.ts    lo único que ve app/: pantallas y tipos de rutas
      rutas.ts    tipos de las rutas de la feature
      pantallas/  pantallas (solo importan ui/, core/ y los hooks de su feature)
      components/ piezas propias de la feature
      hooks/      useQuery/useMutation, orquestan api + db + cola de sync; `claves.ts` con las query keys
      api/        llamadas HTTP de la feature y los esquemas zod de sus respuestas (usan core/api)
      db/         repositorio SQLite (drizzle)
      domain/     reglas puras y esquemas de formularios; sin React ni librerías nativas
  core/       infraestructura compartida: api, config, sesion, storage, db, sync, firebase
  ui/         sistema de diseño: tema (unistyles) y primitivas
  assets/     fuentes e imágenes
```

| Desde | Puede importar | No puede importar |
| --- | --- | --- |
| `ui` | solo librerías | `core`, `features`, `app` |
| `core` | `ui` no; solo librerías | `features`, `app` |
| `features` | `core`, `ui` | `app`, otras features |
| `app` | todo | el interior de una feature (`@/features/x/...`) |

Además, en todo `src`:

- Cada módulo de `core` (`api`, `config`, `sesion`, `storage`, ...) y `ui` se importan por su `index.ts`: `@/core/api`, no `@/core/api/errores`. Dentro del propio módulo se usan rutas relativas.
- Los imports relativos no suben más de un nivel (`../x` sí, `../../x` no); para llegar más lejos se usa `@/`. Así nadie se salta las reglas de capas con rutas relativas.
- Las carpetas vacías de la estructura no se crean por adelantado: aparecen cuando la feature las necesita.

## Reglas

- Las pantallas no llaman a axios ni a SQLite. Usan hooks de su feature, y el hook decide si el dato sale de la API o de la base local.
- Toda escritura del conductor (entregar, novedad, recogida, posición) se guarda primero en SQLite como operación pendiente y la cola de `core/sync` la envía. "Online" es solo el caso en que la cola se vacía al instante.
- El `id_operacion` es la llave de idempotencia ante Fluor: se genera con un generador criptográfico (`react-native-get-random-values` + `uuid`, por agregar en la Fase 2), no con `Math.random` como `X-Request-ID`.
- Las query keys de cada feature viven en `hooks/claves.ts` y empiezan por el nombre de la feature.
- Cada respuesta de Fluor pasa por un esquema zod. Los tipos se derivan con `z.infer`.
- Errores: `core/api/errores.ts` traduce los errores de Fluor y de red. Las pantallas muestran `mensajeUsuario(error)`.
- Estado: sesión y preferencias en zustand (MMKV); datos del servidor en TanStack Query; formularios en react-hook-form. Tokens en el llavero seguro, no en MMKV.
- Estilos: solo `StyleSheet` de unistyles con el tema de `ui/tema`. Sin colores literales ni estilos inline (ESLint lo bloquea).
- Íconos: `lucide-react-native`, pero solo a través de `ui/iconos.ts`, que importa cada ícono por su ruta. Metro no elimina código sin usar y el paquete completo suma ~2 MB al bundle; ESLint bloquea importarlo directo. Se dibujan con `Icono` (color del tema).
- Tema (`ui/tema/tema.ts`): `exito`, `advertencia` y `peligro` son colores de texto que pasan contraste sobre `fondo`; los `*Suave` son fondos. `marca` es el verde de Cilog en ambos temas. Dirección visual en el mockup https://claude.ai/artifact/DHeeTJvpyQEjdpSax84QgP.
- Los componentes de `ui/` se construyen cuando una pantalla los necesita, no por adelantado.

## Estado de la implementación

| Pieza | Fase | Estado |
| --- | --- | --- |
| Cliente API, errores, paginación, entorno | 0 | Hecho, con pruebas |
| Tema y primitivas de UI | 0 | Hecho, con pruebas. Rediseño según el mockup: componentes de auth listos (Aviso, Encabezado, IconoDestacado, Avatar, Requisito, Marca, toasts) |
| Navegación por estado de sesión (`app/navegacion`) | 1 | Hecho, con pruebas |
| Sesión: token en llavero, perfil y empresa en MMKV (`core/sesion`) | 1 | Hecho, con pruebas |
| Login y selección de empresa (`features/auth`) | 1 | Hecho, con pruebas |
| Firebase (push y sesión única), Sentry | 1 | Pendiente |
| Registro, recuperación de clave y reenvío de verificación | 1 | Hecho, con pruebas. Falta probar contra el Fluor desplegado |
| SQLite, cola y motor de sincronización | 2 | Pendiente |

## Sesión y navegación

- `core/sesion` guarda el estado: `iniciando`, `sinSesion`, `sinEmpresa`, `activa`. El navegador (`app/navegacion/Navegador.tsx`) muestra las pantallas que corresponden a ese estado; no se navega a mano entre login, empresa e inicio.
- El token vive solo en el llavero (`core/storage/llavero.ts`). El usuario y la empresa elegida van en MMKV, porque no son secretos. El perfil guardado se valida con zod al leerlo; si no cuadra (p. ej. lo guardó otra versión), se descarta y se pide login.
- `conectarSesionConApi()` corre al cargar `app/App.tsx`, antes de montar nada. Un 401 solo cierra la sesión si la petición llevaba el token actual: una respuesta tardía con un token anterior no tumba un login nuevo.
- Con una sola empresa se elige sola y no se ofrece "Cambiar de empresa" (`tieneVariasEmpresas` en la sesión).
- Tokens: Fluor entrega a `client_type: "api"` un access token de 60 min y un refresh token de 30 días (desde `1f80800`). Ambos van juntos en el llavero. Un servidor anterior no envía refresh: la sesión dura lo que el access token.
- Al arrancar, se pide login solo si ninguno de los dos sirve (se lee `exp` del JWT). Un access token vencido con refresh vigente mantiene la sesión: la primera petición lo renueva.
- Renovación (`core/api/cliente.ts`): ante un 401 con el token actual se llama `POST /auth/seguridad/refresh` **una sola vez** aunque fallen varias peticiones a la vez, y se reintentan con el token nuevo. Si Fluor rechaza el refresh (401/403) o el reintento vuelve a dar 401, la sesión se cierra y avisa. Si la renovación falla por red, la sesión **no** se cierra (offline-first): la petición falla con `SIN_CONEXION`.
- Cambiar de usuario o de empresa limpia la caché de TanStack Query, para no mostrar datos de otra empresa.
- Todas las llamadas sin sesión van con `client_type: "api"`, que Fluor no protege con Turnstile.

## Cuentas sin sesión

- Registro, recuperar clave y reenviar verificación llaman a `/auth/user/registrar`, `/recuperar-clave` y `/reenviar-verificacion`. Fluor responde igual exista o no el correo en recuperar y reenviar.
- Los correos de Fluor enlazan a la **web** (`/auth/verify-email`, `/auth/restablecer-clave`), no a la app. La app solo pide el correo; el usuario verifica o crea la clave nueva en la web. Abrir esos enlaces dentro de la app exige deep links y un cambio en `frontend_url` del backend: ver `docs/contratos-fluor.md`.
- Un login con 403 y `is_verified: false` no muestra toast: la pantalla ofrece reenviar el correo.
- Turnstile: Fluor solo lo exige al cliente `web` (login, registrar, recuperar, restablecer y reenviar). La app se identifica como `api` y no lo usa, así que no hay WebView ni site key. Un servidor sin la actualización `329211e` de Fluor seguirá respondiendo "Token de verificación requerido" en registro y recuperación.
- Fluor no impone política de clave; la app exige 8 caracteres como mínimo.
- Los límites de Fluor son estrictos: 3/min en registrar y recuperar, 1/min en reenviar y 5/min en login. Un 429 muestra "Demasiados intentos".
