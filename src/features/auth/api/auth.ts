import {z} from 'zod';

import {cliente, paginaDe} from '@/core/api';
import {esquemaEmpresa, esquemaUsuario, type Empresa} from '@/core/sesion';

/**
 * Fluor solo exige Turnstile al cliente `web`, así que las llamadas sin sesión van como
 * `api`. Un servidor sin esa actualización ignora el campo en registro y recuperación.
 */
const CLIENTE = 'api';

const esquemaRespuestaLogin = z.object({
  access_token: z.string(),
  token_type: z.string().nullish(),
  user: esquemaUsuario,
});

const esquemaPaginaEmpresas = paginaDe(esquemaEmpresa);

export const iniciarSesionApi = async (email: string, clave: string) => {
  const {data} = await cliente.post('/auth/seguridad/login', {
    email,
    password: clave,
    client_type: CLIENTE,
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

export type DatosRegistro = {
  nombres: string;
  apellidos: string;
  numeroIdentificacion: string;
  email: string;
  clave: string;
};

/** Crea la cuenta. Fluor envía el correo de verificación; la cuenta no sirve hasta verificarla. */
export const registrarApi = async (datos: DatosRegistro) => {
  await cliente.post('/auth/user/registrar', {
    email: datos.email,
    password: datos.clave,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    numero_identificacion: datos.numeroIdentificacion,
    client_type: CLIENTE,
  });
};

/** Responde igual exista o no el correo, para no revelar qué cuentas existen. */
export const recuperarClaveApi = async (email: string) => {
  await cliente.post('/auth/user/recuperar-clave', {
    email,
    client_type: CLIENTE,
  });
};

export const reenviarVerificacionApi = async (email: string) => {
  await cliente.post('/auth/user/reenviar-verificacion', {
    email,
    client_type: CLIENTE,
  });
};
