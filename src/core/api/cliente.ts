import axios, {type InternalAxiosRequestConfig} from 'axios';
import {z} from 'zod';

import {env} from '@/core/config';

import {traducirError} from './errores';
import {generarIdPeticion} from './idPeticion';

/**
 * El cliente no importa la sesión (evita el ciclo api <-> sesion): `core/sesion`
 * registra aquí cómo obtener los tokens y la empresa (tenant) activos, cómo
 * guardar un token renovado y qué hacer si la sesión ya no sirve.
 */
export type ProveedorSesion = {
  obtenerToken: () => string | null;
  obtenerTokenRenovacion: () => string | null;
  obtenerTenantId: () => number | null;
  /** Debe dejar el token nuevo disponible en `obtenerToken` antes de resolver. */
  alRenovarToken: (token: string) => Promise<void>;
  alSesionInvalida: () => void;
};

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * El 401 de esta petición es del negocio (p. ej. "Clave incorrecta" al
     * eliminar la cuenta), no de la sesión: no renueva el token ni la cierra.
     */
    sinRenovar?: boolean;
  }
}

let sesion: ProveedorSesion | null = null;

export const configurarSesionApi = (proveedor: ProveedorSesion | null) => {
  sesion = proveedor;
};

const OPCIONES = {
  baseURL: env.API_URL,
  timeout: 20_000,
  headers: {Accept: 'application/json'},
};

export const cliente = axios.create(OPCIONES);

/** Sin interceptores: un 401 al renovar no debe disparar otra renovación. */
export const clienteRenovacion = axios.create(OPCIONES);

const esquemaRenovacion = z.object({access_token: z.string()});

type ConfigConRenovacion = InternalAxiosRequestConfig & {_renovado?: boolean};

/** Último cambio de token, para reintentar peticiones que salieron con el anterior. */
let renovacionReciente: {anterior: string; nuevo: string} | null = null;
let renovacionEnCurso: Promise<string | null> | null = null;

/**
 * Pide un access token nuevo con el refresh token. Null si el servidor lo
 * rechaza (hay que iniciar sesión). Si falla por red, lanza el error: sin
 * señal no se cierra la sesión, el conductor sigue trabajando offline.
 */
const pedirRenovacion = async (): Promise<string | null> => {
  const tokenRenovacion = sesion?.obtenerTokenRenovacion();
  const anterior = sesion?.obtenerToken();
  if (!tokenRenovacion || !anterior) return null;
  try {
    const {data} = await clienteRenovacion.post(
      '/auth/seguridad/refresh',
      {refresh_token: tokenRenovacion},
      {headers: {'X-Request-ID': generarIdPeticion()}},
    );
    const nuevo = esquemaRenovacion.parse(data).access_token;
    // Antes de guardarlo: la sesión cambia el token en memoria enseguida, y un
    // 401 que llegue mientras se escribe en el llavero debe reconocerlo.
    renovacionReciente = {anterior, nuevo};
    await sesion?.alRenovarToken(nuevo);
    return nuevo;
  } catch (error) {
    const {estado} = traducirError(error);
    if (estado === 401 || estado === 403) return null;
    throw error;
  }
};

/** Una sola renovación aunque varias peticiones reciban 401 a la vez. */
const renovarToken = () => {
  renovacionEnCurso ??= pedirRenovacion().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
};

cliente.interceptors.request.use(config => {
  config.headers.set('X-Request-ID', generarIdPeticion());

  const token = sesion?.obtenerToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  // Fluor no lee la empresa del JWT: se envía en cada petición. Una petición
  // de otra empresa trae la suya. Las de /tte/movil no la usan: van por
  // X-Tenant-Despacho-ID.
  const tenantId = sesion?.obtenerTenantId();
  if (
    tenantId !== null &&
    tenantId !== undefined &&
    !config.headers.has('X-Tenant-ID')
  ) {
    config.headers.set('X-Tenant-ID', String(tenantId));
  }
  return config;
});

cliente.interceptors.response.use(
  respuesta => respuesta,
  async error => {
    const errorApi = traducirError(error);
    const config: ConfigConRenovacion | undefined = axios.isAxiosError(error)
      ? error.config
      : undefined;
    const autorizacion = config?.headers?.Authorization;
    // Sin token (login) o ya reintentada: el 401 llega tal cual.
    if (
      errorApi.estado !== 401 ||
      !config ||
      !autorizacion ||
      config.sinRenovar
    ) {
      return Promise.reject(errorApi);
    }

    const actual = sesion?.obtenerToken();
    const conTokenActual = autorizacion === `Bearer ${actual}`;
    // Otra petición ya renovó el token mientras esta iba en camino.
    const conTokenRenovado =
      renovacionReciente !== null &&
      autorizacion === `Bearer ${renovacionReciente.anterior}` &&
      actual === renovacionReciente.nuevo;
    // Un 401 de un token que ya no es el de esta sesión (p. ej. tras un login nuevo) se ignora.
    if (!conTokenActual && !conTokenRenovado) {
      return Promise.reject(errorApi);
    }
    if (config._renovado) {
      sesion?.alSesionInvalida();
      return Promise.reject(errorApi);
    }

    let nuevo: string | null;
    try {
      nuevo = conTokenRenovado ? (actual ?? null) : await renovarToken();
    } catch (errorRenovacion) {
      return Promise.reject(traducirError(errorRenovacion));
    }
    if (!nuevo) {
      sesion?.alSesionInvalida();
      return Promise.reject(errorApi);
    }
    // El interceptor de petición pone el token nuevo al reintentar.
    config._renovado = true;
    return cliente(config);
  },
);
