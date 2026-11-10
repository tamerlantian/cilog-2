# CLAUDE.md

App React Native 0.88 bare (`com.semantica.cilog2`, visible "Cilog"), TypeScript estricto, Nueva Arquitectura. Es la reescritura de la app anterior y se publica como ficha nueva en Google Play ("Cilog2"); la anterior (`com.plutonio`) se retira cuando todos migren. Backend: Fluor (FastAPI, multi-tenant). El código y la UI van en español (dominio) con lo técnico en inglés (`useQuery`, `Screen`).

## Comandos

```bash
npm run validar     # lint + typecheck + test; correr antes de dar algo por terminado
npm test -- __tests__/core/errores.test.ts   # un solo archivo
npm run build:aab   # AAB de release con .env.prod
```

## Reglas que no se negocian

- No cambiar `applicationId` (`com.semantica.cilog2`) una vez publicado, ni la clave de subida. `versionCode` siempre mayor que el último subido a Play. No tocar la app anterior (`com.plutonio`). Ver `docs/release-play.md`.
- Secretos fuera del repo: `.env*`, `google-services.json` y las `MYAPP_UPLOAD_*` de `~/.gradle/gradle.properties`. Nunca agregarlos a `android/gradle.properties`.
- Capas: `ui` no importa `core`/`features`; `core` no importa `features`/`app`; `features` no importan `app` ni otras features. Módulos de `core` y `ui` se importan por su `index.ts` (`@/core/api`), y los relativos no suben más de un nivel. ESLint lo hace cumplir. Detalle en `docs/arquitectura.md`.
- Las pantallas no llaman a axios ni SQLite; usan hooks de su feature. Toda escritura offline pasa por la cola de operaciones pendientes con `id_operacion` UUID.
- Respuestas de Fluor siempre validadas con zod. Errores con `mensajeUsuario(error)` de `@/core/api`.
- Estilos solo con `StyleSheet` de unistyles y el tema de `ui/tema`. Sin colores literales ni estilos inline (ESLint lo bloquea). Los colores viven solo en `ui/tema/paletas/` y se usan por rol (`tema.colores.accion`); la paleta activa se cambia en `paletas/index.ts`. Ver *Paletas* en `docs/arquitectura.md`. Importar primitivas e íconos desde `@/ui`; un ícono nuevo se agrega en `ui/iconos.ts` (nunca `lucide-react-native` directo).
- `edgeToEdgeEnabled=true`: toda pantalla usa `Pantalla` (respeta safe areas y teclado).
- Alias `@/` apunta a `src/`. No hay archivos `.js` en `src/`.

## Sesión

`useSesion` (`@/core/sesion`) es la fuente de verdad: token, usuario y empresa. No guardes tokens fuera del llavero. Las features no se importan entre sí (ESLint lo bloquea); lo compartido sube a `core/` o `ui/`.

## Fluor

Login `POST /auth/seguridad/login` con `client_type: "api"`; todas las demás rutas llevan `Authorization: Bearer` y `X-Tenant-ID`. Errores `{success:false, error:{code,message}, request_id}`. Faltan endpoints para entregar, novedades y paquete offline: ver `docs/contratos-fluor.md`.

## Pruebas

Jest con mocks de unistyles, MMKV, `react-native-config` y safe-area en `jest.config.js` / `jest.setup.js`. RNTL 14: `render` y `fireEvent` son asíncronos (`await`).
