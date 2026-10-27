import axios from 'axios';

import {env} from '@/core/config/env';

import {traducirError} from './errores';
import {generarIdPeticion} from './idPeticion';

/**
 * `core` no conoce las features: la feature de auth registra aquí cómo obtener
 * el token y la empresa (tenant) activos y qué hacer si el servidor responde 401.
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
    const llevabaToken = Boolean(
      axios.isAxiosError(error) && error.config?.headers?.Authorization,
    );
    if (errorApi.estado === 401 && llevabaToken) {
      sesion?.alSesionInvalida();
    }
    return Promise.reject(errorApi);
  },
);
