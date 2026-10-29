import axios from 'axios';

import {env} from '@/core/config';

import {traducirError} from './errores';
import {generarIdPeticion} from './idPeticion';

/**
 * El cliente no importa la sesión (evita el ciclo api <-> sesion): `core/sesion`
 * registra aquí cómo obtener el token y la empresa (tenant) activos y qué hacer
 * si el servidor responde 401.
 */
export type ProveedorSesion = {
  obtenerToken: () => string | null;
  obtenerTenantId: () => number | null;
  alSesionInvalida: () => void;
};

let sesion: ProveedorSesion | null = null;

export const configurarSesionApi = (proveedor: ProveedorSesion | null) => {
  sesion = proveedor;
};

export const cliente = axios.create({
  baseURL: env.API_URL,
  timeout: 20_000,
  headers: {Accept: 'application/json'},
});

cliente.interceptors.request.use(config => {
  config.headers.set('X-Request-ID', generarIdPeticion());

  const token = sesion?.obtenerToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  // Fluor no lee la empresa del JWT: se envía en cada petición.
  const tenantId = sesion?.obtenerTenantId();
  if (tenantId !== null && tenantId !== undefined) {
    config.headers.set('X-Tenant-ID', String(tenantId));
  }
  return config;
});

cliente.interceptors.response.use(
  respuesta => respuesta,
  error => {
    const errorApi = traducirError(error);
    const autorizacion = axios.isAxiosError(error)
      ? error.config?.headers?.Authorization
      : undefined;
    // Un 401 de una petición hecha con un token anterior no debe cerrar la sesión nueva.
    const conTokenActual =
      Boolean(autorizacion) &&
      autorizacion === `Bearer ${sesion?.obtenerToken()}`;
    if (errorApi.estado === 401 && conTokenActual) {
      sesion?.alSesionInvalida();
    }
    return Promise.reject(errorApi);
  },
);
