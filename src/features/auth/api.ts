import {cliente} from '@/core/api/cliente';
import type {Empresa} from '@/core/sesion';

import {esquemaPaginaEmpresas, esquemaRespuestaLogin} from './esquemas';

/** El login móvil usa `client_type: "api"`, que no exige Turnstile. */
export const iniciarSesionApi = async (email: string, clave: string) => {
  const {data} = await cliente.post('/auth/seguridad/login', {
    email,
    password: clave,
    client_type: 'api',
  });
  return esquemaRespuestaLogin.parse(data);
};

/** Empresas del usuario autenticado. No lleva `X-Tenant-ID`: aún no hay empresa elegida. */
export const listarEmpresasApi = async (): Promise<Empresa[]> => {
  const {data} = await cliente.get('/mas/user-tenant/lista', {
    params: {page: 1, size: 100},
  });
  return esquemaPaginaEmpresas.parse(data).items.filter(e => e.activo);
};
