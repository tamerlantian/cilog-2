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

type Desafio = {turnstileToken?: string | undefined};

export type DatosRegistro = Desafio & {
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
    turnstile_token: datos.turnstileToken,
  });
};

/** Responde igual exista o no el correo, para no revelar qué cuentas existen. */
export const recuperarClaveApi = async (email: string, desafio: Desafio) => {
  await cliente.post('/auth/user/recuperar-clave', {
    email,
    turnstile_token: desafio.turnstileToken,
  });
};

export const reenviarVerificacionApi = async (
  email: string,
  desafio: Desafio,
) => {
  await cliente.post('/auth/user/reenviar-verificacion', {
    email,
    turnstile_token: desafio.turnstileToken,
  });
};
