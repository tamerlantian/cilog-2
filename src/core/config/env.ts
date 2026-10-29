import Config from 'react-native-config';
import {z} from 'zod';

const esquemaEnv = z.object({
  API_URL: z.url(),
  ENTORNO: z.enum(['dev', 'prod']).default('dev'),
});

/**
 * Variables de entorno validadas al arrancar. Vienen de `.env` (dev) o de
 * `.env.prod` (release, vía `ENVFILE`). Si falta una, la app falla de inmediato
 * en vez de apuntar a un servidor equivocado.
 */
export const env = esquemaEnv.parse(Config);
