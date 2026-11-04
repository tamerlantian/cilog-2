import Geolocation from '@react-native-community/geolocation';

export type Ubicacion = {latitud: number; longitud: number};

Geolocation.setRNConfiguration({
  skipPermissionRequests: false,
  authorizationLevel: 'whenInUse',
  locationProvider: 'auto',
});

/** Una posición de hace un minuto sirve: el conductor está en la puerta. */
const OPCIONES = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 60_000,
};

/**
 * La posición actual, o null si no hay permiso, el GPS está apagado o tarda.
 * Nunca lanza: la ubicación acompaña la entrega pero no la bloquea.
 */
export const obtenerUbicacion = () =>
  new Promise<Ubicacion | null>(resolver => {
    try {
      Geolocation.getCurrentPosition(
        ({coords}) =>
          resolver({latitud: coords.latitude, longitud: coords.longitude}),
        () => resolver(null),
        OPCIONES,
      );
    } catch {
      resolver(null);
    }
  });
