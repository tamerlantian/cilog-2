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
  core/       infraestructura compartida: api, config, sesion, storage, db, sync, archivos, ubicacion, firebase
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
- Toda escritura del conductor (entregar, novedad, recogida, posición) se guarda primero en SQLite como operación pendiente y la cola de `core/sync` la envía. "Online" es solo el caso en que la cola se vacía al instante. Diseño completo (estados, errores, fusión, sesión) en `docs/offline.md`.
- El `id_operacion` es la llave de idempotencia ante Fluor: se genera con un generador criptográfico (`react-native-get-random-values`, importado primero en `index.js`, + `uuid`), no con `Math.random` como `X-Request-ID`.
- Base local (`core/db`): op-sqlite con drizzle **sobre `sqlite-proxy`**, no sobre el driver `drizzle-orm/op-sqlite`: ese driver (0.45) llama a una API vieja de op-sqlite y su `transaction` hace COMMIT sin esperar el callback async. Con el proxy, el mismo código corre en Jest sobre `libsql` en memoria (mock de op-sqlite en `jest.setup.js`).
- Hay una sola conexión, así que todo acceso pasa por `leer(fn)` o `escribir(fn)` (transacción), que van de a uno. No anidar: un `leer`/`escribir` dentro de otro se queda esperando. Los repositorios reciben el `db`/`tx` como parámetro.
- El esquema real lo crean `core/db/migraciones.ts` (`PRAGMA user_version`); `esquema.ts` (drizzle) debe coincidir. Nunca se edita una migración publicada.
- Las query keys de cada feature viven en `hooks/claves.ts` y empiezan por el nombre de la feature.
- Datos locales en pantalla: las consultas a SQLite también van por TanStack Query (`useConsultaLocal` en `features/despachos/hooks/local.ts`: sin reintentos, `staleTime: Infinity`, `networkMode: 'always'`). Se refrescan invalidando `['despachos']`: lo hacen las mutaciones al terminar y `escucharCola` (`core/sync`) cada vez que el motor cambia una operación. Las mutaciones también usan `networkMode: 'always'`, para que sin señal fallen con `SIN_CONEXION` en vez de quedar en pausa.
- Cada respuesta de Fluor pasa por un esquema zod. Los tipos se derivan con `z.infer`.
- Errores: `core/api/errores.ts` traduce los errores de Fluor y de red. Las pantallas muestran `mensajeUsuario(error)`.
- Estado: sesión y preferencias en zustand (MMKV); datos del servidor en TanStack Query; formularios en react-hook-form. Tokens en el llavero seguro, no en MMKV.
- Estilos: solo `StyleSheet` de unistyles con el tema de `ui/tema`. Sin colores literales ni estilos inline (ESLint lo bloquea).
- Íconos: `lucide-react-native`, pero solo a través de `ui/iconos.ts`, que importa cada ícono por su ruta. Metro no elimina código sin usar y el paquete completo suma ~2 MB al bundle; ESLint bloquea importarlo directo. Se dibujan con `Icono` (color del tema).
- Color: ver *Paletas* abajo. Dirección visual en el canvas https://claude.ai/artifact/DHeeTJvpyQEjdpSax84QgP (variante *Ruta*, paleta *Navy Cilog*).
- Marca: los SVG de `assets/marca/` son la fuente del ícono y de la pantalla de carga. Si cambian, se regeneran los PNG: la pantalla de carga con `npx react-native-bootsplash generate assets/marca/logo.svg --platforms=android,ios --background=#143049 --logo-width=168 --assets-output=<carpeta temporal>` (luego descartar lo que el generador reformatea en `AndroidManifest.xml` y `styles.xml`), y los `mipmap-*/ic_launcher*.png`, el `AppIcon` de iOS y `icono-play-512.png` desde `icono.svg` con `sharp`. El ícono adaptativo de Android usa `drawable/ic_launcher_foreground.xml` y `ic_launcher_background` de `values/colors.xml`.

## Paletas

Todos los colores de la app viven en `src/ui/tema/paletas/`, y en ningún otro lado (ESLint bloquea hex fuera de esa carpeta, incluido `tema.ts`).

```
ui/tema/paletas/
  tipos.ts         Escena y Paleta: los roles que toda paleta debe llenar (TypeScript avisa si falta uno)
  navyCilog.ts     la paleta actual (colores de marca: navy y azules)
  bosqueLima.ts    la anterior (bosque y lima), lista como alternativa
  cilogClasica.ts  la de la app vieja (verde azulado y amarillo), lista como alternativa
  index.ts         registro `paletas` y PALETA_ACTIVA
ui/tema/tema.ts    arma los temas desde PALETA_ACTIVA; espaciado, radios y tipografía
```

- Los componentes solo usan roles (`tema.colores.accion`), nunca valores. Cambiar de paleta es cambiar `PALETA_ACTIVA` en `paletas/index.ts`; una paleta nueva es un archivo más con la forma de `Paleta`, registrado en `paletas`.
- Cada paleta tiene tres escenas: `claro` y `oscuro` (siguen al sistema) y `marca` (superficie de marca: acceso, tarjeta destacada). `<Escena nombre="marca">` de `@/ui` aplica la escena a todo lo que envuelve (`ScopedTheme` de unistyles), así que `Input`, `Boton` o `Texto` no necesitan variantes "sobre marca".
- Roles principales: `suelo` es el fondo de pantalla y `fondo` el de tarjetas, diálogos y campos elevados; `campo`/`bordeCampo` los campos de texto; `primario` es el color de marca para texto, foco, selección y progreso; `accion`/`sobreAccion` el relleno del botón principal; `acento` es decorativo. `exito`, `advertencia`, `peligro` e `info` son texto sobre `suelo` y sobre su `*Suave`.
- `__tests__/ui/paletas.test.ts` recorre todas las paletas registradas y exige 4.5:1 en los pares de texto y 3:1 en el borde de los campos. Una paleta que no pasa no entra.
- `papel` y `tinta` (la firma) son fijos en toda paleta (`FIRMA`).
- Tarjetas destacadas sobre fondo claro (despacho en curso, siguiente entrega): `TarjetaDestacada` de despachos, que es `Escena` de marca con el `suelo` de esa escena.
- La escena `oscuro` de *Navy Cilog* no está en el canvas: se derivó de la de marca.
- `ScopedTheme` solo alcanza a los componentes de React Native que procesa el plugin de babel de unistyles. Un fondo puesto en un componente de terceros (p. ej. `SafeAreaView`) no toma la escena: por eso `Pantalla` pinta el fondo en un `View` propio.
- El fast refresh a veces pierde la escena por zona y la pantalla sale con los colores del tema claro. Para revisar colores hay que reiniciar la app.
- `Pantalla` elige la barra de estado (clara u oscura) según la luminancia de su fondo, así que funciona con cualquier paleta y en modo oscuro.

## Tipografía

Inter (lectura: 400, 500, 600), Space Grotesk 700 (títulos: variantes `marca`, `display` y `titulo` de `Texto`) y JetBrains Mono 500 (códigos). Los `.ttf` estáticos (OFL, de Google Fonts) están en `src/assets/fonts` y `npx react-native-asset` los copia a `android/` e `ios/`. Android elige la fuente por el nombre del archivo, así que cada peso es una familia (`Inter-SemiBold`); los nombres viven solo en `tema.tipografia.familia`. Agregar o cambiar una fuente exige recompilar la app nativa.
- Los componentes de `ui/` se construyen cuando una pantalla los necesita, no por adelantado.
- Evidencias (`core/archivos`): la cámara es la del sistema (`react-native-image-picker`, máx. 1.280 px, calidad 0,7, sin guardar en la galería). Android declara `CAMERA` por el lector de códigos (`react-native-camera-kit`), y con eso la cámara del sistema también exige el permiso concedido: `tomarFoto` lo pide antes de abrirla (`pedirPermisoCamara`). Si quedó bloqueado ("no volver a preguntar" o negado dos veces), se ofrece abrir los ajustes. La firma se dibuja con `react-native-svg` y se guarda como PNG con `react-native-view-shot`; usa los colores `papel`/`tinta` del tema, iguales en claro y oscuro, porque la imagen va a la empresa. Antes de guardar, los archivos pasan de la caché a `documentos/evidencias` (`@dr.pogodin/react-native-fs`); si la transacción falla, se borran. Se borran también al confirmarse en Fluor o al descartarse.
- Ubicación (`core/ubicacion`): se pide al abrir el formulario y nunca bloquea; sin GPS la operación sale con `latitud`/`longitud` en null.
- Versiones nativas fijadas exactas (`--save-exact`) en image-picker, geolocation, react-native-fs y view-shot: las más nuevas tenían menos de dos semanas.

## Estado de la implementación

| Pieza | Fase | Estado |
| --- | --- | --- |
| Cliente API, errores, paginación, entorno | 0 | Hecho, con pruebas |
| Tema y primitivas de UI | 0 | Hecho, con pruebas. Paletas centralizadas (`ui/tema/paletas`, *Navy Cilog* activa), escenas con `Escena` y tipografía nueva (Inter, Space Grotesk, JetBrains Mono) |
| Navegación por estado de sesión (`app/navegacion`) | 1 | Hecho, con pruebas |
| Sesión: token en llavero, perfil y empresa en MMKV (`core/sesion`) | 1 | Hecho, con pruebas |
| Login y selección de empresa (`features/auth`) | 1 | Hecho, con pruebas. La empresa es opcional (solo ingreso y envíos). Rediseño *Ruta · Bosque y lima*: todo el acceso va en la escena de marca (`PantallaAcceso`); probado en el emulador |
| Firebase (push y sesión única), Sentry | 1 | Pendiente |
| Registro, recuperación de clave y reenvío de verificación | 1 | Hecho, con pruebas. Falta probar contra el Fluor desplegado |
| SQLite, cola y motor de sincronización (`core/db`, `core/sync`) | 2 | Hecho, con pruebas. Sin enviadores aún: Fluor no publica entregar, novedad ni terminar |
| Despachos: API, repositorio y casos de uso (vincular, actualizar, descargar, desvincular) | 2 | Hecho, con pruebas. Falta probar contra Fluor |
| Pantallas de despachos: Mis despachos, Vincular (manual), Despacho, Guía, Envíos y chip de envíos en el encabezado | 2 | Hecho, con pruebas. Lector de códigos en el buscador de Despacho (abre la guía si coincide exacto); vincular por QR pendiente (falta el formato). Rediseño *Ruta* en Mis despachos (en curso destacado, terminados), Despacho (avance, tarjeta *Siguiente*, paradas en línea de tiempo) y Guía; Vincular con el diseño *Ruta* en ingreso manual (sin escáner); Envíos y Cuenta como pestañas |
| Entregar, novedad y terminar despacho: guardado local + cola (`db/gestion.ts`) | 3a | Hecho, con pruebas. Sin envío (Fluor no publica los endpoints); tipos de novedad y configuración de entrega provisionales (ver `docs/contratos-fluor.md`). Fotos, firma y GPS en 3b |
| Fotos (hasta 4), firma y ubicación de la entrega (`core/archivos`, `core/ubicacion`, `ui/PanelFirma`) | 3b | Hecho, con pruebas. Pantallas según el canvas de diseño (entrega en 3 pasos, novedad con opciones a la vista, diálogo de terminar), con el estilo *Ruta · Bosque y lima*. Probado en el emulador; falta un teléfono real |
| Mi cuenta (`features/cuenta`): usuario, versión instalada y cerrar sesión con aviso de envíos pendientes | 2 | Hecho, con pruebas |

## Sesión y navegación

- `core/sesion` guarda el estado: `iniciando`, `sinSesion`, `activa`. El navegador (`app/navegacion/Navegador.tsx`) muestra las pantallas que corresponden a ese estado; no se navega a mano entre login e inicio.
- La empresa es **opcional**: el repartidor accede a sus despachos por la asignación (`mas_tenant_despacho`), no por `user_tenant`, y puede tener despachos de varias empresas. Tras el login se entra directo a *Mis despachos*; la pantalla `Empresa` (para ingreso y envíos) sigue registrada, pero hoy ninguna pantalla la abre.
- Con sesión, el stack raíz empieza en `Inicio`: las pestañas (`app/navegacion/Pestanas.tsx`, `@react-navigation/bottom-tabs`) *Despachos* (`MisDespachos`), *Envíos* (`Envios`) y *Cuenta*. Encima, sin la barra: `Despacho` → `Guia` → `Entregar` o `Novedad` (modales), `VincularDespacho` y `Empresa`. `Entregar` es un asistente de 3 pasos (fotos, quién recibe, firma) y al guardar se reemplaza por `EntregaGuardada`, que lleva a la siguiente guía pendiente; `Novedad` vuelve a `Despacho`. La pestaña *Ingreso* del canvas se agrega cuando exista la feature.
- React Navigation 7 no navega por nombre a una pantalla de un navegador hijo: para abrir una pestaña desde una pantalla del stack se usa `navigate('Inicio', {screen: 'Envios'})` (así lo hace `ChipEnvios`, el estado de la cola en el encabezado de Mis despachos, Despacho y Guía). Las pantallas de pestaña usan `bordes={BORDES_PESTANA}` porque la barra ya respeta el borde de abajo, y `Encabezado grande` como título.
- Al arrancar, el navegador también espera a que la base local abra y la sincronización encienda (`app/providers/useDatosLocales.ts`). Si la base no abre, muestra un error con *Reintentar*.
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
