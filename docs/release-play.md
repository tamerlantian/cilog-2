# Publicar en Google Play

La app se publica como **app nueva** en Play, con el título **Cilog2**. No reemplaza a la Cilog anterior (`com.plutonio`): las dos conviven en el teléfono mientras los conductores migran, y la anterior se retira cuando ya nadie la use.

| Qué | Valor | Dónde se controla |
| --- | --- | --- |
| `applicationId` | `com.semantica.cilog2`. **Permanente** desde la primera subida a Play | `android/app/build.gradle` (y `PRODUCT_BUNDLE_IDENTIFIER` en iOS) |
| Clave de subida (upload key) | La de `MYAPP_UPLOAD_*`; Play App Signing guarda la clave de la app | `~/.gradle/gradle.properties` (fuera del repo) |
| `versionCode` | Mayor que el último subido a **esta** ficha. Parte en 1 (`versionName` 1.0.0) | `android/app/build.gradle` |
| Nombre en el teléfono | "Cilog" (`app_name`); el título de la ficha es "Cilog2" | `android/app/src/main/res/values/strings.xml` |

Además, `targetSdk` 36 y las librerías nativas alineadas a 16 KB son requisitos vigentes de Play (ya vienen resueltos en React Native 0.88).

**No subir nada a la ficha anterior** (`com.plutonio`) desde este proyecto: tiene otro `applicationId` y otra clave de subida.

## Preparar la máquina (una sola vez)

1. En `~/.gradle/gradle.properties` deben existir las cuatro variables de firma: `MYAPP_UPLOAD_STORE_FILE`, `MYAPP_UPLOAD_KEY_ALIAS`, `MYAPP_UPLOAD_STORE_PASSWORD`, `MYAPP_UPLOAD_KEY_PASSWORD`.
2. Crear `.env.prod` a partir de `.env.example` con la URL de producción. No se versiona.
3. Firebase todavía no está integrado. Cuando se integre, registrar `com.semantica.cilog2` como app Android nueva en el proyecto y usar su `google-services.json` (fuera del repo): el de la app anterior es de `com.plutonio` y no sirve.

El build de release **falla a propósito** si faltan las variables de firma, para no generar un archivo firmado con la clave de debug.

## Generar el archivo

```bash
# 1. Subir versionCode (y versionName) en android/app/build.gradle.
# 2. Verificar el código
npm run validar
# 3. AAB para Play Console
npm run build:aab        # android/app/build/outputs/bundle/release/app-release.aab
# APK para pruebas directas
npm run build:apk        # android/app/build/outputs/apk/release/app-release.apk
```

`build:aab` y `build:apk` fijan `ENVFILE=.env.prod`, así que el release siempre apunta a producción. **Fluor de producción debe tener antes las rutas `/tte/movil/*`**: si responden 404, la app interpreta que el despacho ya no está asignado y lo borra del teléfono.

## Verificar antes de subir

```bash
# Paquete y firma
$ANDROID_HOME/build-tools/36.0.0/aapt2 dump packagename android/app/build/outputs/apk/release/app-release.apk
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep SHA256

# Alineación a 16 KB del APK
$ANDROID_HOME/build-tools/36.0.0/zipalign -c -P 16 -v 4 android/app/build/outputs/apk/release/app-release.apk
```

Después de la primera subida, el `SHA256` debe coincidir con la clave de subida registrada en Play Console (Configuración, Integridad de la app).

## Crear la ficha (una sola vez)

1. Play Console, *Crear app*: título "Cilog2", app gratuita. Activar Play App Signing.
2. Ficha: ícono `assets/marca/icono-play-512.png`, gráfico destacado (1024×500) y capturas.
3. Política de privacidad (URL pública): ubicación, cámara y fotos, firma, correo e identificación.
4. Eliminación de cuenta: la app la ofrece en *Mi cuenta*; Play pide además una URL web para solicitarla sin la app.
5. Seguridad de los datos, clasificación de contenido y público objetivo.
6. Acceso a la app: una cuenta de prueba con un despacho asignado para el revisor.
7. Si la cuenta de desarrollador es personal y reciente, Play exige una prueba cerrada (12 testers, 14 días) antes de producción.

## Lanzar y migrar

1. Subir el AAB a **pruebas internas** y probarlo en dispositivos reales con la cuenta de un conductor.
2. Pasarlo a producción con despliegue gradual (por ejemplo 10 %, 50 %, 100 %).
3. Avisar a los conductores que **sincronicen la app anterior antes de cambiar**: lo guardado sin señal allá no pasa a la nueva.
4. Cuando todos usen Cilog2, anular la publicación de la ficha anterior. Su API debe seguir viva mientras quede alguien con la app vieja instalada.

## Si algo falla

- *"El APK o AAB usa una clave de firma diferente"*: la clave de subida no es la registrada en esta ficha. No subir; recuperar el keystore correcto o pedir un restablecimiento en Play Console.
- *"El código de versión ya fue usado"*: subir `versionCode`.
- *"El nombre de paquete ya existe"*: el `applicationId` está tomado por otra app; no reusar `com.plutonio`.
