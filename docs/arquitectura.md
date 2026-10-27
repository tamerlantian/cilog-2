# Arquitectura

Organización por *features* con capas. Una capa solo conoce la de abajo, y ESLint lo hace cumplir (`no-restricted-imports`).

```
src/
  app/        arranque: providers y navegación raíz
  features/   un directorio por módulo de negocio (auth, despachos, guias, ...)
    <feature>/
      pantallas/  pantallas (solo importan ui/, core/ y los hooks de su feature)
      components/ piezas propias de la feature
      hooks/      useQuery/useMutation, orquestan api + db + cola de sync
      api/        llamadas HTTP de la feature (usan core/api)
      db/         repositorio SQLite (drizzle)
      domain/     reglas puras y esquemas zod; sin React ni librerías nativas
  core/       infraestructura compartida: api, config, sesion, storage, db, sync, firebase
  ui/         sistema de diseño: tema (unistyles) y primitivas
  assets/     fuentes e imágenes
```

| Desde | Puede importar | No puede importar |
| --- | --- | --- |
| `ui` | solo librerías | `core`, `features`, `app` |
| `core` | `ui` no; solo librerías | `features`, `app` |
| `features` | `core`, `ui` | `app`, otras features |
| `app` | todo | |

## Reglas

- Las pantallas no llaman a axios ni a SQLite. Usan hooks de su feature, y el hook decide si el dato sale de la API o de la base local.
- Toda escritura del conductor (entregar, novedad, recogida, posición) se guarda primero en SQLite como operación pendiente y la cola de `core/sync` la envía. "Online" es solo el caso en que la cola se vacía al instante.
- Cada respuesta de Fluor pasa por un esquema zod. Los tipos se derivan con `z.infer`.
- Errores: `core/api/errores.ts` traduce los errores de Fluor y de red. Las pantallas muestran `mensajeUsuario(error)`.
- Estado: sesión y preferencias en zustand (MMKV); datos del servidor en TanStack Query; formularios en react-hook-form. Tokens en el llavero seguro, no en MMKV.
- Estilos: solo `StyleSheet` de unistyles con el tema de `ui/tema`. Sin colores literales ni estilos inline (ESLint lo bloquea).

## Estado de la implementación

| Pieza | Fase | Estado |
| --- | --- | --- |
| Cliente API, errores, paginación, entorno | 0 | Hecho, con pruebas |
| Tema y primitivas de UI | 0 | Hecho, con pruebas |
| Navegación por estado de sesión (`app/navegacion`) | 1 | Hecho, con pruebas |
| Sesión: token en llavero, perfil y empresa en MMKV (`core/sesion`) | 1 | Hecho, con pruebas |
| Login y selección de empresa (`features/auth`) | 1 | Hecho, con pruebas |
| Firebase (push y sesión única), Sentry | 1 | Pendiente |
| Registro y recuperación de clave (WebView con Turnstile) | 1 | Pendiente |
| SQLite, cola y motor de sincronización | 2 | Pendiente |

## Sesión y navegación

- `core/sesion` guarda el estado: `iniciando`, `sinSesion`, `sinEmpresa`, `activa`. El navegador (`app/navegacion/Navegador.tsx`) muestra las pantallas que corresponden a ese estado; no se navega a mano entre login, empresa e inicio.
- El token vive solo en el llavero (`core/storage/llavero.ts`). El usuario y la empresa elegida van en MMKV, porque no son secretos.
- Al arrancar, un token vencido (se lee `exp` del JWT) se descarta y se pide login. Un 401 con token cierra la sesión y avisa. Fluor no entrega refresh para `api`: queda pendiente alargar el JWT móvil con backend (ver `docs/contratos-fluor.md`).
- Cambiar de usuario o de empresa limpia la caché de TanStack Query, para no mostrar datos de otra empresa.
- El login móvil usa `client_type: "api"`, que Fluor no protege con Turnstile. Solo registro y recuperación de clave lo exigen.
