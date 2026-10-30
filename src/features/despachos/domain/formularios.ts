import {z} from 'zod';

import {LARGO_MAXIMO_DESCRIPCION} from './gestion';

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

const textoOpcional = (maximo: number, mensaje: string) =>
  z.string().trim().max(maximo, mensaje);

/** Todo opcional, como en el legacy: la empresa puede exigir foto o firma (paso 3b). */
export const esquemaFormularioEntrega = z.object({
  recibe: textoOpcional(100, 'Máximo 100 caracteres'),
  numeroIdentificacion: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Solo números')
    .max(20, 'Máximo 20 dígitos'),
  parentesco: z.string(),
  celular: z
    .string()
    .trim()
    .regex(/^\d*$/, 'Solo números')
    .max(15, 'Máximo 15 dígitos'),
});

export type FormularioEntrega = z.infer<typeof esquemaFormularioEntrega>;

export const esquemaFormularioNovedad = z.object({
  tipo: z.string().min(1, 'Elige el tipo de novedad'),
  descripcion: textoOpcional(
    LARGO_MAXIMO_DESCRIPCION,
    `Máximo ${LARGO_MAXIMO_DESCRIPCION} caracteres`,
  ),
});

export type FormularioNovedad = z.infer<typeof esquemaFormularioNovedad>;
