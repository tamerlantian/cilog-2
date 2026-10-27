# Publicar sobre la app que ya está en Google Play

La app nueva **reemplaza a la actual en la misma ficha de Play**: los conductores reciben una actualización normal, no instalan una app distinta.
Eso funciona mientras se cumplan estas cuatro condiciones. Si alguna falla, Play rechaza el archivo.

| Condición | Valor | Dónde se controla |
| --- | --- | --- |
| Mismo `applicationId` | `com.plutonio` | `android/app/build.gradle` |
| Misma clave de subida (upload key) | La de `MYAPP_UPLOAD_*` | `~/.gradle/gradle.properties` (fuera del repo) |
| `versionCode` mayor que el último publicado | Último conocido: 56. Este proyecto parte en **57** | `android/app/build.gradle` |
| Mismo proyecto de Firebase | `plutonio-5d34e` | `android/app/google-services.json` (fuera del repo) |

Además, `targetSdk` 36 y las librerías nativas alineadas a 16 KB son requisitos vigentes de Play (ya vienen resueltos en React Native 0.88).

## Preparar la máquina (una sola vez)

1. En `~/.gradle/gradle.properties` deben existir las cuatro variables de firma: `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_KEY_ALIAS`, `MYAPP_UPLOAD_STORE_PASSWORD`, `MYAPP_UPLOAD_KEY_PASSWORD`. Son las mismas que usa el repositorio anterior.
2. Copiar `google-services.json` del proyecto anterior a `android/app/google-services.json`. Está en `.gitignore`.
3. Crear `.env.prod` a partir de `.env.example` con la URL de producción. Tampoco se versiona.

El build de release **falla a propósito** si faltan las variables de firma, para no generar un archivo firmado con la clave de debug.

## Generar el archivo

```bash
# 1. Subir versionCode (y versionName) en android/app/build.gradle. Debe ser mayor que el publicado.
# 2. Verificar el código
npm run validar
# 3. AAB para Play Console
npm run build:aab        # android/app/build/outputs/bundle/release/app-release.aab
# APK para pruebas directas
npm run build:apk        # android/app/build/outputs/apk/release/app-release.apk
```

`build:aab` y `build:apk` fijan `ENVFILE=.env.prod`, así que el release siempre apunta a producción.

## Verificar antes de subir

```bash
# La firma debe ser la misma clave de subida que la app publicada
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep SHA256

# Alineación a 16 KB del APK
$ANDROID_HOME/build-tools/36.0.0/zipalign -c -P 16 -v 4 android/app/build/outputs/apk/release/app-release.apk
```

El `SHA256` debe coincidir con el de la clave de subida registrada en Play Console (Configuración, Integridad de la app, Firma de la app).

## Cómo actualizar a los usuarios

1. Subir el AAB a un track de **pruebas internas** y probarlo en dispositivos reales con la cuenta de un conductor.
2. Pasarlo a producción con despliegue gradual (por ejemplo 10 %, 50 %, 100 %) mientras se mira Sentry.
3. La versión vieja sigue funcionando contra la API antigua. Al corte, los despachos guardados offline en la app vieja se pierden: avisar a los conductores que sincronicen antes de actualizar.

## Si algo falla

- *"El APK o AAB usa una clave de firma diferente"*: la clave de subida no es la registrada. No subir; recuperar el keystore correcto o pedir un restablecimiento de la clave de subida en Play Console.
- *"El código de versión ya fue usado"*: subir `versionCode`.
- Las notificaciones o la sesión única dejan de funcionar: el `google-services.json` es de otro proyecto de Firebase.
