#!/bin/sh
# Compila en Release (con .env.prod, ver ios/Podfile) e instala y abre Cilog
# en el iPhone conectado. Si hay varios, elige con IPHONE="Nombre" npm run ios:iphone.
set -e
cd "$(dirname "$0")/../ios"

LISTA=$(mktemp)
xcrun devicectl list devices --json-output "$LISTA" >/dev/null 2>&1
DISPOSITIVO=$(python3 - "$LISTA" "${IPHONE:-}" <<'PY'
import json, sys
lista, nombre = sys.argv[1], sys.argv[2]
for d in json.load(open(lista))["result"]["devices"]:
    c, p = d["connectionProperties"], d["deviceProperties"]
    if c.get("pairingState") != "paired" or c.get("tunnelState") == "unavailable":
        continue
    if nombre and p["name"] != nombre:
        continue
    print(d["identifier"], d["hardwareProperties"]["udid"], p["name"])
    break
PY
)
rm -f "$LISTA"

if [ -z "$DISPOSITIVO" ]; then
  echo "No hay un iPhone emparejado y disponible. Conéctalo, desbloquéalo y confía en este Mac." >&2
  exit 1
fi
set -- $DISPOSITIVO
ID_DEVICECTL=$1
UDID=$2
echo "Compilando para $3 ($UDID)..."

LOG=build/dispositivo.log
mkdir -p build
if ! ENVFILE=.env.prod xcodebuild -workspace plutonio.xcworkspace -scheme plutonio \
  -configuration Release -destination "id=$UDID" -derivedDataPath build/dispositivo \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration build >"$LOG" 2>&1; then
  grep -E "error:" "$LOG" | head -20 >&2
  echo "Falló la compilación. Log completo: ios/$LOG" >&2
  exit 1
fi

xcrun devicectl device install app --device "$ID_DEVICECTL" \
  build/dispositivo/Build/Products/Release-iphoneos/plutonio.app
xcrun devicectl device process launch --device "$ID_DEVICECTL" com.semantica.cilog2
