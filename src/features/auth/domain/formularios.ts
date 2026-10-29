import {z} from 'zod';

/** Fluor no impone política de clave; la app exige este mínimo. */
export const LARGO_MINIMO_CLAVE = 8;

const textoObligatorio = (mensaje: string) => z.string().trim().min(1, mensaje);

const correo = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo')
  .pipe(z.email('Correo no válido'));

export const esquemaFormularioLogin = z.object({
  email: correo,
  clave: z.string().min(1, 'Ingresa tu clave'),
});

export const esquemaFormularioRegistro = z
  .object({
    nombres: textoObligatorio('Ingresa tus nombres'),
    apellidos: textoObligatorio('Ingresa tus apellidos'),
    numeroIdentificacion: textoObligatorio(
      'Ingresa tu número de identificación',
    ),
    email: correo,
    clave: z
      .string()
      .min(
        LARGO_MINIMO_CLAVE,
        `La clave debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres`,
      ),
    confirmarClave: z.string().min(1, 'Confirma tu clave'),
  })
  .refine(datos => datos.clave === datos.confirmarClave, {
    path: ['confirmarClave'],
    message: 'Las claves no coinciden',
  });

export const esquemaFormularioCorreo = z.object({email: correo});

export type FormularioLogin = z.infer<typeof esquemaFormularioLogin>;
export type FormularioRegistro = z.infer<typeof esquemaFormularioRegistro>;
export type FormularioCorreo = z.infer<typeof esquemaFormularioCorreo>;
