# Arquitectura

Organización por *features* con capas. Una capa solo conoce la de abajo, y ESLint lo hace cumplir (`no-restricted-imports`).

```
src/
  app/        arranque: providers, navegación raíz, pantalla base
  features/   un directorio por módulo de negocio (auth, despachos, guias, ...)
    <feature>/
      screens/    pantallas (solo importan ui/, sus hooks y components)
      components/ piezas propias de la feature
      hooks/      useQuery/useMutation, orquestan api + db + cola de sync
      api/        llamadas HTTP de la feature (usan core/api)
      db/         repositorio SQLite (drizzle)
      domain/     reglas puras y esquemas zod; sin React ni librerías nativas
  core/       infraestructura compartida: api, config, db, sync, storage, firebase
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
| Navegación, auth, sesión, Firebase, Sentry | 1 | Pendiente |
| SQLite, cola y motor de sincronización | 2 | Pendiente |
