import Config from 'react-native-config';
import {z} from 'zod';

// react-native-config entrega '' para una variable en blanco.
const optionalVacio = z
  .string()
  .optional()
  .transform(valor => valor || undefined);

const esquemaEnv = z.object({
  API_URL: z.url(),
  ENTORNO: z.enum(['dev', 'prod']).default('dev'),
  // Sin site key la app no muestra el desafío: solo sirve contra un Fluor con TURNSTILE_ENABLED=False.
  TURNSTILE_SITE_KEY: optionalVacio,
  // Debe ser un hostname autorizado en el widget de Cloudflare. Si falta se usa el de API_URL.
  TURNSTILE_BASE_URL: optionalVacio,
});

/**
 * Variables de entorno validadas al arrancar. Vienen de `.env` (dev) o de
 * `.env.prod` (release, vía `ENVFILE`). Si falta una, la app falla de inmediato
 * en vez de apuntar a un servidor equivocado.
 */
export const env = esquemaEnv.parse(Config);
