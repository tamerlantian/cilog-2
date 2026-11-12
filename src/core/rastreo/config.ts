import {
  AuthorizationStrategy,
  DesiredAccuracy,
  LogLevel,
  type AuthorizationConfig,
  type Config,
  type HttpConfig,
} from 'react-native-background-geolocation';

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
    // El servicio arranca con la app abierta: no hace falta "todo el tiempo"
    // (docs/rastreo.md, Decisiones).
    locationAuthorizationRequest: 'WhenInUse',
  },
  app: {
    // Sigue reportando si el conductor cierra la app desde recientes.
    stopOnTerminate: false,
    // Sin permiso de segundo plano no podría arrancar tras reiniciar.
    startOnBoot: false,
    // Quieto, un punto cada 5 min para que el mapa sepa que sigue ahí.
    heartbeatInterval: 300,
    notification: {
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
