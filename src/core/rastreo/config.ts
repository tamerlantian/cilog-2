import {
  AuthorizationStatus,
  AuthorizationStrategy,
  DesiredAccuracy,
  LogLevel,
  type AuthorizationConfig,
  type Config,
  type HttpConfig,
} from 'react-native-background-geolocation';
import {Platform} from 'react-native';

import {env} from '@/core/config';

export type CredencialesRastreo = {
  token: string | null;
  tokenRenovacion: string | null;
};

const BASE = env.API_URL.replace(/\/+$/, '');

/**
 * Cada punto con los nombres de Fluor (`POST /tte/movil/despacho/ubicacion-lote`).
 * `timestamp` sale en ISO UTC y Fluor lo pasa a la hora del negocio. Velocidad
 * en m/s; Android pone -1 cuando no la sabe (docs/contratos-fluor.md §12).
 */
export const PLANTILLA_UBICACION =
  '{"fecha":"<%= timestamp %>","latitud":<%= latitude %>,"longitud":<%= longitude %>,' +
  '"velocidad":<%= speed %>,"altitud":<%= altitude %>,' +
  '"exactitud":<%= accuracy %>,"exactitud_altitud":<%= altitude_accuracy %>}';

/** Los puntos van a la asignación (despacho) que se está rastreando. */
export const configuracionHttp = (asignacion: number | null): HttpConfig => ({
  url: `${BASE}/tte/movil/despacho/ubicacion-lote`,
  headers:
    asignacion === null ? {} : {'X-Tenant-Despacho-ID': String(asignacion)},
  autoSync: true,
  batchSync: true,
  // Fluor acepta hasta 500; lotes chicos fallan menos con mala señal.
  maxBatchSize: 50,
  // Envía de a 5 puntos. Al arrancar o detenerse el vehículo envía todo lo
  // pendiente aunque no llegue a 5.
  autoSyncThreshold: 5,
  rootProperty: 'ubicaciones',
  timeout: 30_000,
});

/**
 * Si Fluor responde 401, el plugin renueva el token por su cuenta (también con
 * la app cerrada) y avisa con `onAuthorization`.
 */
export const configuracionAutorizacion = ({
  token,
  tokenRenovacion,
}: CredencialesRastreo): AuthorizationConfig | undefined =>
  token === null
    ? undefined
    : {
        strategy: AuthorizationStrategy.Jwt,
        accessToken: token,
        ...(tokenRenovacion === null
          ? {}
          : {
              refreshToken: tokenRenovacion,
              refreshUrl: `${BASE}/auth/seguridad/refresh`,
              refreshPayload: {refresh_token: '{refreshToken}'},
            }),
      };

/**
 * iOS no tiene foreground service: con "mientras se usa", al quedar quieto el
 * plugin apaga el GPS, iOS suspende la app y solo una geocerca (que exige
 * "Siempre") la despierta. Sin "Siempre" se deja el GPS encendido todo el
 * despacho y se pierde la detección de paradas (más batería, pero no deja de
 * reportar). Con "Siempre" vuelve la detección. Android no cambia: allí lo
 * resuelve el servicio fijo (`notification.sticky`). Ver docs/rastreo.md, iOS.
 */
export const configuracionSegunPermiso = (
  status: number,
): Pick<Config, 'geolocation' | 'activity'> | null => {
  if (Platform.OS !== 'ios') return null;
  const siempre = status === AuthorizationStatus.Always;
  return {
    geolocation: {pausesLocationUpdatesAutomatically: siempre},
    activity: {disableStopDetection: !siempre},
  };
};

export const configuracion = (
  asignacion: number | null,
  credenciales: CredencialesRastreo,
): Config => ({
  geolocation: {
    desiredAccuracy: DesiredAccuracy.High,
    // Un punto cada 50 m en movimiento; en carretera el plugin los espacia solo.
    distanceFilter: 50,
    // 5 min quieto: apaga el GPS hasta que el vehículo se vuelva a mover.
    stopTimeout: 5,
    // Android: el servicio arranca con la app abierta y no hace falta "todo
    // el tiempo". iOS: "Siempre" para seguir con la app cerrada y en las
    // paradas; si lo niega, ver `configuracionSegunPermiso` (docs/rastreo.md).
    locationAuthorizationRequest:
      Platform.OS === 'ios' ? 'Always' : 'WhenInUse',
    // Sin el diálogo del plugin (en inglés): la línea del despacho avisa y
    // lleva a los ajustes.
    disableLocationAuthorizationAlert: true,
  },
  app: {
    // Sigue reportando si el conductor cierra la app desde recientes.
    stopOnTerminate: false,
    // Sin permiso de segundo plano no podría arrancar tras reiniciar.
    startOnBoot: false,
    // Quieto, un punto cada 5 min para que el mapa sepa que sigue ahí. En iOS
    // solo corre con `preventSuspend`, que no se usa por la batería: quieto,
    // el mapa muestra el último punto hasta que el vehículo se mueva.
    heartbeatInterval: 300,
    notification: {
      // Sin esto el plugin cierra el servicio al quedar quieto y, con permiso
      // "mientras se usa", Android no lo deja volver a abrirlo desde segundo
      // plano: dejaba de reportar en la primera parada (prueba en ruta, 13 nov
      // 2026). Con el servicio siempre abierto el GPS igual se apaga quieto.
      sticky: true,
      title: 'Cilog: ruta en curso',
      text: 'La empresa ve tu ubicación mientras tengas el despacho abierto.',
      channelName: 'Ruta en curso',
      smallIcon: 'drawable/ic_stat_cilog',
    },
  },
  http: configuracionHttp(asignacion),
  authorization: configuracionAutorizacion(credenciales),
  persistence: {
    locationTemplate: PLANTILLA_UBICACION,
    // Si pasan 3 días sin señal, los puntos más viejos ya no sirven.
    maxDaysToPersist: 3,
  },
  logger: {
    debug: false,
    logLevel: env.ENTORNO === 'prod' ? LogLevel.Warning : LogLevel.Verbose,
  },
});
