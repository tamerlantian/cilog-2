import {z} from 'zod';

export const esquemaUsuario = z.object({
  id: z.number(),
  email: z.string(),
  role: z.string().nullish(),
  numero_identificacion: z.string().nullish(),
});

export const esquemaEmpresa = z.object({
  id: z.number(),
  tenant_id: z.number(),
  tenant_nombre: z.string().nullable(),
  activo: z.boolean(),
});

/** Lo que se guarda en MMKV. Se valida al leer: puede venir de una versión anterior de la app. */
export const esquemaPerfil = z.object({
  usuario: esquemaUsuario,
  empresa: esquemaEmpresa
    .pick({tenant_id: true, tenant_nombre: true})
    .nullable(),
  /** Con una sola empresa no se ofrece cambiarla. */
  tieneVariasEmpresas: z.boolean(),
});

export type Usuario = z.infer<typeof esquemaUsuario>;
export type Empresa = z.infer<typeof esquemaEmpresa>;
export type Perfil = z.infer<typeof esquemaPerfil>;
