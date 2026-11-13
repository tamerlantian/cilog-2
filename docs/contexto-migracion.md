# Contexto de la migración (Plutonio → plutonio-app)

Resumen para retomar el trabajo desde este repo. El proyecto viejo (`/Users/sebastianhoyos/Desktop/semantica/cilog`, RN 0.81, native-base, Redux) queda **solo como referencia**. Este repo es la reescritura.

## Qué es

- App de logística para conductores y mensajeros: entregas, novedades, despachos, seguimiento.
- Se publica como **la misma app de Google Play**: `applicationId` `com.plutonio`, nombre visible **Cilog**.
- Código, nombres y UI en español.
- Backend nuevo: **Fluor** (`/Users/sebastianhoyos/Desktop/semantica/fluor`, prod `https://api.semanticaapi.com.co`). La API vieja (PHP, sin token) desaparece.
- Plan original: https://claude.ai/artifact/13X4dgttApsdRgrZNcEmdg ("Plan de refactorización Plutonio").

## Decisiones tomadas (no reabrir sin motivo)

- Reescritura en proyecto nuevo, **React Native 0.88 bare (no Expo)**, Nueva Arquitectura.
- iOS configurado desde el inicio (bundle `com.plutonio`, pods instalados; falta compilar en Xcode).
- Solo las funcionalidades iniciales. Se descartan: noticias, cupón, foto de perfil, mapa, Viajes, Solicitar ayuda.
- Los despachos offline de la app vieja se pierden al corte.
- Firebase: FCM para push y RTDB para sesión única en la v1. Mismo proyecto `plutonio-5d34e`.
- **Turnstile fuera de la app**: todas las llamadas sin sesión van con `client_type: "api"` (Fluor solo exige Turnstile a `"web"`).
- No cambiar `applicationId`, ni de proyecto Firebase, ni bajar `versionCode`, para poder actualizar la misma app en Play.

## Stack

RN 0.88, TypeScript estricto, React Navigation 7, Zustand + TanStack Query, MMKV, react-native-keychain (token), unistyles 3, zod + react-hook-form, axios. Previstos: op-sqlite + drizzle, vision-camera, geolocation, firma con canvas, Firebase 27, Sentry, Reanimated 4 (drawer).

Tooling: ESLint 9 flat, Prettier, husky (pre-commit: lint-staged + typecheck; commit-msg: commitlint), CI en `.github/workflows/ci.yml`, Maestro. `npm run validar` = lint + typecheck + tests.

Reglas de ESLint: prohíbe imports entre capas, estilos o colores literales, e imports entre features.

## Arquitectura (`src/`)

- `core/api/`: cliente axios (Bearer, `X-Tenant-ID`, un 401 con token llama `alSesionInvalida`), errores (`ErrorApi`, `mensajeUsuario`), `jwt.ts`, QueryClient compartido, paginación.
- `core/storage/`: MMKV (`almacen.ts`) y keychain (`llavero.ts`).
- `core/sesion/`: store `useSesion`. Estados `iniciando`, `sinSesion`, `sinEmpresa`, `activa`. El token vive en el llavero; el perfil (usuario y empresa) en MMKV bajo `sesion.perfil`. Cambiar usuario o empresa limpia la caché de consultas.
- `core/config/env.ts`: solo `API_URL` y `ENTORNO`.
- `features/auth/`: login, registro, recuperar clave, reenviar verificación, selección de empresa.
- `features/inicio/InicioPantalla.tsx`: provisional.
- `app/`: providers y navegación (el stack se elige según `estado`).
- `ui/tema/unistyles.ts`: los temas se llaman exactamente `light` y `dark` (por `adaptiveThemes`), más `marca`, que se aplica por zonas con `<Escena>`.

Más detalle en `docs/arquitectura.md`, `docs/contratos-fluor.md`, `docs/release-play.md` y `CLAUDE.md`.

## Estado

Commits en `main` (sin remoto, nada subido): `072da36` inicial, `5c271b2` Fase 0, `d446519` login/empresa/sesión, `30654a4` fix temas, `a6fb6c0` registro/recuperar/reenviar, `ca167f1` fuera Turnstile.

Hecho (Fase 0 y gran parte de la Fase 1): config, cliente API, sesión segura, login, selección de empresa, registro, recuperación de clave, reenvío de verificación. 48 tests en verde, bundle de Android compila.

**No verificado**: la UI nunca se ha visto en pantalla por mí, ni el registro contra producción, ni iOS.

## Pendientes, en orden sugerido

1. **Probar login y registro en el emulador**: `npm run android` (reinstalar; se quitó el WebView). `.env` apunta a producción. Si el registro responde "Token de verificación requerido", producción aún no tiene el commit `329211e` de Fluor. Entonces usar Fluor local (`API_URL=http://10.0.2.2:8000`) o crear la cuenta desde la web.
2. **Refresh token** (propuesto, sin confirmar): Fluor (`1f80800`) ya devuelve `refresh_token` de 30 días en el login con `mobile` o `api`, y `POST /auth/seguridad/refresh` con `{refresh_token}` devuelve `{access_token, token_type}` (10/min). Plan: guardarlo en el llavero, renovar solo ante un 401 con una única petición de refresh en curso, y cerrar sesión si falla. Considerar pasar el login a `client_type: "mobile"` (puede fallar en un prod no actualizado). Actualizar `docs/contratos-fluor.md` (sección 16) y `docs/arquitectura.md` (~línea 54), que aún dicen que no hay refresh.
3. **Firebase 27** (push y sesión única). `google-services.json` ya está copiado (ignorado por git).
4. **Sentry** (falta el DSN).
5. **Fase 2**: compatibilidad de `@react-native-community/geolocation` con Nueva Arquitectura, librería de compresión de imágenes, op-sqlite + drizzle, cola `operaciones_pendientes` con motor de sincronización (un solo flujo de despacho, sin duplicar online/offline), pantallas de despacho, guías y novedades.
6. Compilar iOS en Xcode y probar en dispositivo físico.

## Publicación en Play

- El keystore original `Cilog-key.keystore` se perdió. Play App Signing está activo, así que basta cambiar la **clave de subida**: Play Console → Clave de subida → Solicitar cambio ("He perdido mi clave de subida"). **No usar "Actualizar clave"** (cambia la clave de firma).
- Keystore nuevo: `android/app/Cilog-key.keystore` (PKCS12, alias `cilog-upload`), certificado `upload_certificate.pem`. Solicitud enviada; falta la aprobación de Google (unos días).
- SHA-256 de la nueva clave de subida: `04:79:74:51:55:86:70:17:9D:30:5E:B1:E0:A7:3F:6C:4B:F8:CC:EB:FE:12:C3:0F:64:89:3B:7B:51:0B:93:76`. Compararla con `keytool -printcert -jarfile <aab>` y con la huella de Play Console.
- `~/.gradle/gradle.properties` aún tiene el alias viejo (`Cilog-alias`) y las contraseñas viejas. Hay que poner `MYAPP_UPLOAD_KEY_ALIAS=cilog-upload` y las contraseñas del keystore nuevo (en PKCS12 ambas son iguales). Las `MYAPP_UPLOAD_*` viven ahí y **nunca** en `android/gradle.properties`.
- Versión: `versionCode` 57, `versionName` "2.0.0" (se asume que el último publicado es el 56; confirmarlo).
- Con aprobación de Google: `npm run build:aab`, comparar el SHA-256 y subir.

## Backend (Fluor)

Pendiente enviar `docs/contratos-fluor.md` al equipo. Endpoints que faltan: entregar guía, crear novedad, tipos de novedad, vincular despacho por token, paquete offline, terminar despacho, mis despachos, config de entrega del operador, push tokens, cambio de clave autenticado. Temas abiertos: relación usuario ↔ conductor (propuesta: comparar `numero_identificacion`), selección de empresa cuando hay varias, y enlaces de correo hacia la app (hoy apuntan a la web).

Datos útiles de Fluor:
- Login `POST /auth/seguridad/login` (5/min). Un 403 "Cuenta no verificada" llega como `error.is_verified: false`.
- `registrar` (3/min), `recuperar-clave` (3/min), `restablecer-clave` (5/min), `reenviar-verificacion` (1/min).
- Empresas: `GET /mas/user-tenant/lista`, items con `{id, tenant_id, tenant_nombre, empleado_id, codigo_usuario_fk, activo}`.
- Errores: `{success:false, error:{code,message}, request_id}`. Fluor no impone política de clave (la app exige 8 caracteres).

## Notas de pruebas (Jest)

- `jest.config.js` usa `forceExit: true` (las transiciones de native-stack dejan temporizadores) y `transformIgnorePatterns` para `@react-navigation`, `react-native-screens` y `react-native-keychain`.
- `jest.setup.js` mockea react-native-config, MMKV, safe-area, keychain (en memoria) y toast.
- RNTL 14: `render` y `fireEvent` son asíncronos, usar `await`.
- No usar `jest.resetAllMocks()`: borra el mock de `useSafeAreaInsets`.
- El mock de unistyles no detecta nombres de tema incorrectos.

## Reglas de seguridad

- Secretos (`.env*` salvo `.env.example`, `google-services.json`, `GoogleService-Info.plist`, `*.keystore`, `*.pem`, contraseñas) nunca van al repo. Verificar antes de cada commit.
- No hacer push, crear remotos ni publicar en Play sin confirmación explícita.
- No tocar el repo `fluor` desde aquí; los cambios de backend se piden con `docs/contratos-fluor.md`.
