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
  // Como la app anterior: letras y números, en mayúsculas (Fluor compara exacto).
  token: z
    .string()
    .trim()
    .min(1, 'Ingresa el token')
    .max(20, 'El token tiene máximo 20 caracteres')
    .regex(/^[a-zA-Z0-9]+$/, 'Solo letras y números')
    .transform(token => token.toUpperCase()),
});

export type FormularioVincular = z.input<typeof esquemaFormularioVincular>;
export type DatosFormularioVincular = z.output<
  typeof esquemaFormularioVincular
>;

const numeroQr = z.union([
  z.number().int().nonnegative(),
  z.string().trim().regex(/^\d+$/),
]);

/**
 * El QR del manifiesto es un JSON:
 * `{"operador":18,"codigoDespacho":272345,"token":"76C7","contenido":"MEC:..."}`.
 * `contenido` es el texto impreso del manifiesto; no se usa.
 */
const esquemaQrDespacho = z.object({
  operador: numeroQr,
  codigoDespacho: numeroQr,
  token: z.string().trim().min(1),
});

/** Los datos del QR listos para el formulario, o `null` si no es un QR de despacho. */
export const leerQrDespacho = (crudo: string): FormularioVincular | null => {
  let json: unknown;
  try {
    json = JSON.parse(crudo.trim());
  } catch {
    return null;
  }
  const qr = esquemaQrDespacho.safeParse(json);
  if (!qr.success) return null;
  return {
    operador: String(qr.data.operador),
    despacho: String(qr.data.codigoDespacho),
    token: qr.data.token.toUpperCase(),
  };
};

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
