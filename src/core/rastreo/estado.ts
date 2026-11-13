import BackgroundGeolocation, {
  AuthorizationStatus,
  type ProviderChangeEvent,
} from 'react-native-background-geolocation';
import {getBrand} from 'react-native-device-info';

/**
 * - concedido: "mientras se usa la app" o "siempre".
 * - negado: se puede volver a pedir.
 * - bloqueado: "no volver a preguntar"; solo se cambia en los ajustes.
 */
export type PermisoUbicacion = 'concedido' | 'negado' | 'bloqueado';

export type EstadoUbicacion = {
  permiso: PermisoUbicacion;
  /** El GPS (servicios de ubicación) del teléfono está encendido. */
  gpsEncendido: boolean;
};

const comoPermiso = (status: number): PermisoUbicacion => {
  if (
    status === AuthorizationStatus.Always ||
    status === AuthorizationStatus.WhenInUse
  ) {
    return 'concedido';
  }
  return status === AuthorizationStatus.DeniedAlways ? 'bloqueado' : 'negado';
};

const comoEstado = ({status, enabled}: ProviderChangeEvent) => ({
  permiso: comoPermiso(status),
  gpsEncendido: enabled,
});

export const leerEstadoUbicacion = async (): Promise<EstadoUbicacion> =>
  comoEstado(await BackgroundGeolocation.getProviderState());

/** Avisa cuando el conductor cambia el permiso o apaga/enciende el GPS. */
export const escucharEstadoUbicacion = (
  oyente: (estado: EstadoUbicacion) => void,
) => {
  const suscripcion = BackgroundGeolocation.onProviderChange(evento =>
    oyente(comoEstado(evento)),
  );
  return () => suscripcion.remove();
};

/** Muestra el diálogo de Android. Si lo niega, el plugin rechaza con el estado. */
export const pedirPermisoUbicacion = async (): Promise<PermisoUbicacion> => {
  try {
    return comoPermiso(await BackgroundGeolocation.requestPermission());
  } catch (estado) {
    return typeof estado === 'number' ? comoPermiso(estado) : 'negado';
  }
};

/** Cilog está fuera del ahorro de batería de Android (no lo duermen). */
export const bateriaSinRestricciones = async () => {
  try {
    return await BackgroundGeolocation.deviceSettings.isIgnoringBatteryOptimizations();
  } catch {
    // Sin forma de saberlo: no se molesta al conductor.
    return true;
  }
};

/**
 * Abre los ajustes de batería: los del fabricante (Xiaomi, Huawei…) si el
 * plugin los conoce; si no, los de Android.
 */
export const abrirAjustesBateria = async () => {
  const ajustes = BackgroundGeolocation.deviceSettings;
  try {
    return await ajustes.show(await ajustes.showPowerManager());
  } catch {
    return ajustes.show(await ajustes.showIgnoreBatteryOptimizations());
  }
};

/** Marca del teléfono (Xiaomi, samsung…), para la guía de batería. */
export const marcaTelefono = () => getBrand();
