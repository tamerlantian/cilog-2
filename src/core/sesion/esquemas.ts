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

export type Usuario = z.infer<typeof esquemaUsuario>;
export type Empresa = z.infer<typeof esquemaEmpresa>;
