import {z} from 'zod';

const entero = (mensaje: string) =>
  z
    .string()
    .trim()
    .min(1, mensaje)
    .regex(/^\d+$/, 'Solo números')
    .transform(Number);

/** Los mismos tres datos que trae el QR del despacho. */
export const esquemaFormularioVincular = z.object({
  operador: entero('Ingresa el operador'),
  despacho: entero('Ingresa el número del despacho'),
  token: z
    .string()
    .trim()
    .min(1, 'Ingresa el token')
    .max(20, 'El token tiene máximo 20 caracteres'),
});

export type FormularioVincular = z.input<typeof esquemaFormularioVincular>;
export type DatosFormularioVincular = z.output<
  typeof esquemaFormularioVincular
>;
