# Plutonio

App de logística para conductores y mensajeros (`com.semantica.cilog2`, nombre visible **Cilog**): despachos, entregas con firma y foto, novedades, recogidas y monitoreo, con modo offline.
React Native 0.88 (Nueva Arquitectura, bare) y TypeScript estricto. Backend: Fluor (FastAPI).

Se publica como app nueva en Google Play (ficha **Cilog2**) y convive con la Cilog anterior hasta que todos migren. Ver [docs/release-play.md](docs/release-play.md).

## Empezar

```bash
npm install
cp .env.example .env          # y .env.prod para release
cp <proyecto-anterior>/android/app/google-services.json android/app/
npm start
npm run android               # o: cd ios && bundle exec pod install && cd .. && npm run ios
```

Requisitos: Node 22+, JDK 17, Android SDK (compileSdk 37), Xcode para iOS.
En el emulador de Android el servidor local de Fluor es `http://10.0.2.2:8000`.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run validar` | Lint + typecheck + pruebas (lo mismo que corre la CI) |
| `npm run lint` / `typecheck` / `test` | Cada verificación por separado |
| `npm run format` | Prettier sobre `src` y `__tests__` |
| `npm run build:aab` | AAB firmado para Play, con `.env.prod` |
| `npm run build:apk` | APK firmado de release, con `.env.prod` |
| `maestro test .maestro` | Flujos end-to-end en un dispositivo |

Los commits siguen Conventional Commits en español (`feat: entrega offline con firma`). Husky corre lint-staged y typecheck antes de cada commit.

## Documentación

- [docs/arquitectura.md](docs/arquitectura.md): capas, reglas de importación y estado de cada pieza.
- [docs/contratos-fluor.md](docs/contratos-fluor.md): endpoints que hay que pedir al backend, con request y response.
- [docs/release-play.md](docs/release-play.md): cómo generar y verificar el archivo que se sube a Play Console.
