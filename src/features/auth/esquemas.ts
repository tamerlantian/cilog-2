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
