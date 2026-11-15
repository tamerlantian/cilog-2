# Publicar en el App Store

La app se publica como **app nueva** con el nombre **Cilog2**, igual que en Play. En el iPhone se ve "Cilog" (`CFBundleDisplayName`). Solo iPhone: no se publica para iPad.

| Qué | Valor | Dónde se controla |
| --- | --- | --- |
| Bundle ID | `com.semantica.cilog2`. **Permanente** desde la primera subida | `PRODUCT_BUNDLE_IDENTIFIER` en `ios/plutonio.xcodeproj` |
| Versión | `MARKETING_VERSION`, igual a `versionName` de Android | Xcode, target *plutonio* |
| Build | `CURRENT_PROJECT_VERSION`, mayor que el último subido para esa versión. Se lleva igual al `versionCode` de Android | Xcode, target *plutonio* |
| Dispositivos | Solo iPhone (`TARGETED_DEVICE_FAMILY = 1`). Si se publica con iPad ya no se puede quitar | Xcode, target *plutonio* |
| Licencia del rastreo | `TRANSISTORSOFT_LICENSE` | `ios/Secretos.xcconfig` (fuera del repo) |

## Preparar la máquina (una sola vez)

1. Copiar `ios/Secretos.xcconfig.example` a `ios/Secretos.xcconfig` y poner la licencia v5 de Transistorsoft para `com.semantica.cilog2` (sin comillas). Llega al `Info.plist` como `TSLocationManagerLicense`. Sin ella el build de release compila, pero **el rastreo no funciona** (en la consola: `LICENSE VALIDATION FAILURE`). Debug funciona sin licencia.
2. `.env.prod` como en Android. El build Release de iOS lo usa siempre: lo fija el `Podfile` en el target `react-native-config`, también al archivar desde Xcode.
3. `npm run ios:pods` después de instalar o actualizar una librería nativa.
4. En Xcode, *Signing & Capabilities*: el equipo de Semantica y firma automática.

Los `.xcconfig` del target (`ios/plutonio/Debug.xcconfig` y `Release.xcconfig`) incluyen los de CocoaPods y, si existe, `ios/Secretos.xcconfig`. No volver a apuntar el target directo a los de `Pods/`.

## Generar el archivo

```bash
# 1. Subir MARKETING_VERSION y CURRENT_PROJECT_VERSION (igual que Android).
npm run validar
npm run build:ios        # ios/build/Cilog.xcarchive
```

Luego se sube con Xcode (*Window > Organizer > Distribute App > App Store Connect*). También se puede archivar directo desde Xcode: *Product > Archive* con el esquema *plutonio*.

## Crear la ficha (una sola vez)

1. App Store Connect, *Nueva app*: nombre "Cilog2", idioma principal español, bundle `com.semantica.cilog2`.
2. Capturas de iPhone de 6,9" (y las de 6,5" si las pide), ícono (sale del `AppIcon`), descripción y palabras clave.
3. URL de la política de privacidad: ubicación en segundo plano durante el despacho, cámara, fotos, firma, nombre y correo.
4. Etiquetas de privacidad (*App Privacy*): las mismas categorías del `PrivacyInfo.xcprivacy` (ubicación precisa, nombre, correo, ID de usuario, fotos, otro contenido), todas ligadas al usuario, para la funcionalidad de la app y sin rastreo publicitario.
5. Cifrado: la app declara `ITSAppUsesNonExemptEncryption = false` (solo HTTPS), así que no pide documentación de exportación.
6. Eliminación de cuenta: la app la ofrece en *Mi cuenta* (Apple lo exige).

## Revisión de Apple

La ubicación en segundo plano es el motivo de rechazo más común. En *Notas para el revisor*:

- Una cuenta de prueba con un despacho **en curso** asignado.
- Por qué se usa "Siempre": la empresa ve la ruta del conductor solo mientras tiene un despacho abierto; se detiene al terminarlo, desvincularlo o cerrar sesión. La app funciona sin ese permiso (entregas y novedades) y lo explica antes de pedirlo.
- Un video corto mostrando el aviso, los dos diálogos de iOS y la línea "Ubicación en vivo".

## Lanzar

1. Subir el build y probarlo por **TestFlight** en un iPhone real con la cuenta de un conductor, incluida la prueba en ruta de `docs/rastreo.md` (iOS).
2. Enviar a revisión. Con *Lanzamiento gradual* la actualización se reparte en 7 días.

## Si algo falla

- *"Missing purpose string"* (ITMS-90683): falta un texto `NS…UsageDescription` en `Info.plist` para una API que usa alguna librería.
- *"Invalid bundle: UIBackgroundModes"*: un modo declarado sin uso. Los tres actuales los pide el plugin de rastreo.
- *"The bundle version must be higher"*: subir `CURRENT_PROJECT_VERSION`.
