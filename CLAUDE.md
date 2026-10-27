# CLAUDE.md

App React Native 0.88 bare (`com.plutonio`, visible "Cilog"), TypeScript estricto, Nueva Arquitectura. Es la reescritura de la app anterior; reemplaza a la publicada en Google Play sin cambiar de ficha. Backend: Fluor (FastAPI, multi-tenant). El código y la UI van en español (dominio) con lo técnico en inglés (`useQuery`, `Screen`).

## Comandos

```bash
npm run validar     # lint + typecheck + test; correr antes de dar algo por terminado
npm test -- __tests__/core/errores.test.ts   # un solo archivo
npm run build:aab   # AAB de release con .env.prod
```

## Reglas que no se negocian

- No cambiar `applicationId` (`com.plutonio`) ni la clave de firma. `versionCode` siempre mayor que el publicado en Play (parte en 57). Ver `docs/release-play.md`.
- Secretos fuera del repo: `.env*`, `google-services.json` y las `MYAPP_UPLOAD_*` de `~/.gradle/gradle.properties`. Nunca agregarlos a `android/gradle.properties`.
- Capas: `ui` no importa `core`/`features`; `core` no importa `features`/`app`; `features` no importan `app` ni otras features. ESLint lo hace cumplir. Detalle en `docs/arquitectura.md`.
- Las pantallas no llaman a axios ni SQLite; usan hooks de su feature. Toda escritura offline pasa por la cola de operaciones pendientes con `id_operacion` UUID.
- Respuestas de Fluor siempre validadas con zod. Errores con `mensajeUsuario(error)` de `core/api/errores.ts`.
- Estilos solo con `StyleSheet` de unistyles y el tema de `ui/tema`. Sin colores literales ni estilos inline (ESLint lo bloquea). Importar primitivas desde `@/ui`.
- `edgeToEdgeEnabled=true`: toda pantalla usa `Pantalla` (respeta safe areas y teclado).
- Alias `@/` apunta a `src/`. No hay archivos `.js` en `src/`.

## Sesión

`useSesion` (`@/core/sesion`) es la fuente de verdad: token, usuario y empresa. No guardes tokens fuera del llavero. Las features no se importan entre sí (ESLint lo bloquea); lo compartido sube a `core/` o `ui/`.

## Fluor

Login `POST /auth/seguridad/login` con `client_type: "api"`; todas las demás rutas llevan `Authorization: Bearer` y `X-Tenant-ID`. Errores `{success:false, error:{code,message}, request_id}`. Faltan endpoints para entregar, novedades y paquete offline: ver `docs/contratos-fluor.md`.

## Pruebas

Jest con mocks de unistyles, MMKV, `react-native-config` y safe-area en `jest.config.js` / `jest.setup.js`. RNTL 14: `render` y `fireEvent` son asíncronos (`await`).
