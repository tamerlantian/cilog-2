import BackgroundGeolocation, {
  type AuthorizationEvent,
  type HttpEvent,
} from 'react-native-background-geolocation';
import {z} from 'zod';

import {almacen} from '@/core/storage';

import {
  configuracion,
  configuracionAutorizacion,
  configuracionHttp,
  type CredencialesRastreo,
} from './config';

/**
 * El rastreo no importa la sesión (como `core/api`): quien lo conecta le dice
 * cómo leer los tokens, guardar uno renovado y cerrar la sesión.
 */
export type ProveedorRastreo = {
  credenciales: () => CredencialesRastreo;
  alRenovarToken: (token: string) => Promise<void>;
  alSesionInvalida: () => void;
};

/** Fluor ya no acepta puntos de la asignación (despacho cerrado o liberado). */
type OyenteRechazo = (asignacion: number) => void;

/** La asignación sobrevive a cerrar la app: `ready()` la necesita al volver. */
const CLAVE_ASIGNACION = 'rastreo.asignacion';

/**
 * Asignaciones que Fluor rechazó (404/409). No se vuelven a rastrear aunque el
 * despacho siga en el teléfono: si no, cada vez que el conductor lo abre
 * arrancaría y Fluor lo volvería a rechazar.
 */
const CLAVE_RECHAZADAS = 'rastreo.rechazadas';
const MAX_RECHAZADAS = 20;

const esquemaRenovacion = z.object({access_token: z.string()});

const oyentesRechazo = new Set<OyenteRechazo>();
let preparado: Promise<void> | null = null;

export const asignacionRastreada = (): number | null => {
  const texto = almacen.getString(CLAVE_ASIGNACION);
  const asignacion = Number(texto);
  return texto && Number.isSafeInteger(asignacion) ? asignacion : null;
};

const leerRechazadas = (): number[] => {
  try {
    const lista: unknown = JSON.parse(
      almacen.getString(CLAVE_RECHAZADAS) ?? '[]',
    );
    return Array.isArray(lista) ? lista.filter(Number.isSafeInteger) : [];
  } catch {
    return [];
  }
};

const rechazar = (asignacion: number) => {
  const lista = [...leerRechazadas().filter(a => a !== asignacion), asignacion];
  almacen.set(CLAVE_RECHAZADAS, JSON.stringify(lista.slice(-MAX_RECHAZADAS)));
};

export const fueRechazada = (asignacion: number) =>
  leerRechazadas().includes(asignacion);

/** Al cerrar sesión: el próximo usuario empieza sin rechazos. */
export const olvidarRechazadas = () => almacen.remove(CLAVE_RECHAZADAS);

const guardarAsignacion = (asignacion: number | null) => {
  if (asignacion === null) almacen.remove(CLAVE_ASIGNACION);
  else almacen.set(CLAVE_ASIGNACION, String(asignacion));
};

const sinFallar = async (accion: () => Promise<unknown>) => {
  try {
    await accion();
  } catch {
    // Sin señal o el plugin ocupado: no hay nada más que hacer con esos puntos.
  }
};

/**
 * Detiene el rastreo y borra los puntos que queden, porque saldrían con el
 * encabezado de la próxima asignación. Con `enviarPendientes` primero intenta
 * enviarlos; sin señal se pierden (es la cola de un despacho que ya terminó).
 */
export const detenerRastreo = async ({
  enviarPendientes,
}: {
  enviarPendientes: boolean;
}) => {
  await preparado?.catch(() => undefined);
  await sinFallar(() => BackgroundGeolocation.stop());
  if (enviarPendientes) await sinFallar(() => BackgroundGeolocation.sync());
  await sinFallar(() => BackgroundGeolocation.destroyLocations());
  guardarAsignacion(null);
};

/**
 * - 404 / 409: la asignación ya no existe o el despacho se cerró. Reintentar
 *   no sirve: se detiene y se avisa para que la app actualice el despacho.
 * - 400 / 422: el lote es inválido y fallaría igual siempre: se descarta.
 * - El resto (red, 5xx, 401) lo reintenta el plugin.
 */
const alResponderFluor = async ({success, status}: HttpEvent) => {
  if (success) return;
  if (status === 404 || status === 409) {
    const asignacion = asignacionRastreada();
    if (asignacion !== null) rechazar(asignacion);
    await detenerRastreo({enviarPendientes: false});
    if (asignacion !== null)
      oyentesRechazo.forEach(oyente => oyente(asignacion));
    return;
  }
  if (status === 400 || status === 422) {
    await sinFallar(() => BackgroundGeolocation.destroyLocations());
  }
};

const alRenovar = async (
  {success, status, response}: AuthorizationEvent,
  proveedor: ProveedorRastreo,
) => {
  if (success) {
    const respuesta = esquemaRenovacion.safeParse(response);
    if (respuesta.success) {
      await proveedor.alRenovarToken(respuesta.data.access_token);
    }
    return;
  }
  // Refresh vencido o usuario inactivo. Sin señal no se cierra la sesión.
  if (status === 401 || status === 403) proveedor.alSesionInvalida();
};

/**
 * Configura el plugin. Se llama una vez al arrancar la app, haya o no
 * rastreo activo: si quedó corriendo (app cerrada desde recientes) lo retoma
 * con la asignación guardada.
 */
export const prepararRastreo = (proveedor: ProveedorRastreo) => {
  preparado ??= (async () => {
    BackgroundGeolocation.onHttp(evento => {
      alResponderFluor(evento).catch(() => undefined);
    });
    BackgroundGeolocation.onAuthorization(evento => {
      alRenovar(evento, proveedor).catch(() => undefined);
    });
    // Quieto, el GPS se apaga: el latido deja un punto para que el mapa sepa
    // que el conductor sigue ahí. Solo con la app viva.
    BackgroundGeolocation.onHeartbeat(() => {
      BackgroundGeolocation.getCurrentPosition({
        samples: 1,
        persist: true,
      }).catch(() => undefined);
    });
    await BackgroundGeolocation.ready(
      configuracion(asignacionRastreada(), proveedor.credenciales()),
    );
  })().catch(error => {
    preparado = null;
    throw error;
  });
  return preparado;
};

const esperarPreparado = () => {
  if (!preparado) {
    throw new Error('Llama a prepararRastreo antes de usar el rastreo.');
  }
  return preparado;
};

/**
 * Empieza a reportar la ubicación a la asignación, o cambia de asignación si
 * ya rastreaba otra. Debe llamarse con la app abierta (foreground service).
 * Devuelve false si Fluor ya había rechazado esa asignación.
 */
export const iniciarRastreo = async (asignacion: number) => {
  await esperarPreparado();
  if (fueRechazada(asignacion)) return false;
  const actual = asignacionRastreada();
  if (actual !== null && actual !== asignacion) {
    // Los puntos del despacho anterior no deben salir con el encabezado nuevo.
    await sinFallar(() => BackgroundGeolocation.sync());
    await sinFallar(() => BackgroundGeolocation.destroyLocations());
  }
  guardarAsignacion(asignacion);
  await BackgroundGeolocation.setConfig({http: configuracionHttp(asignacion)});
  const {enabled} = await BackgroundGeolocation.getState();
  if (!enabled) await BackgroundGeolocation.start();
  return true;
};

/** El token cambió en la app (login o renovación): el plugin usa el nuevo. */
export const actualizarCredencialesRastreo = async (
  credenciales: CredencialesRastreo,
) => {
  if (!preparado) return;
  await preparado;
  const authorization = configuracionAutorizacion(credenciales);
  if (authorization) await BackgroundGeolocation.setConfig({authorization});
};

export const escucharRastreoRechazado = (oyente: OyenteRechazo) => {
  oyentesRechazo.add(oyente);
  return () => {
    oyentesRechazo.delete(oyente);
  };
};
