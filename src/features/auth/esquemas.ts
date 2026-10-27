import {z} from 'zod';

import {paginaDe} from '@/core/api/paginacion';
import {esquemaEmpresa, esquemaUsuario} from '@/core/sesion';

export const esquemaRespuestaLogin = z.object({
  access_token: z.string(),
  token_type: z.string().nullish(),
  user: esquemaUsuario,
});

export const esquemaPaginaEmpresas = paginaDe(esquemaEmpresa);

export const esquemaFormularioLogin = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu correo')
    .pipe(z.email('Correo no válido')),
  clave: z.string().min(1, 'Ingresa tu clave'),
});

export type FormularioLogin = z.infer<typeof esquemaFormularioLogin>;

const textoObligatorio = (mensaje: string) => z.string().trim().min(1, mensaje);
const correo = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo')
  .pipe(z.email('Correo no válido'));

export const esquemaFormularioRegistro = z
  .object({
    nombres: textoObligatorio('Ingresa tus nombres'),
    apellidos: textoObligatorio('Ingresa tus apellidos'),
    numeroIdentificacion: textoObligatorio(
      'Ingresa tu número de identificación',
    ),
    email: correo,
    clave: z.string().min(8, 'La clave debe tener al menos 8 caracteres'),
    confirmarClave: z.string().min(1, 'Confirma tu clave'),
  })
  .refine(datos => datos.clave === datos.confirmarClave, {
    path: ['confirmarClave'],
    message: 'Las claves no coinciden',
  });

export const esquemaFormularioCorreo = z.object({email: correo});

export type FormularioRegistro = z.infer<typeof esquemaFormularioRegistro>;
export type FormularioCorreo = z.infer<typeof esquemaFormularioCorreo>;
