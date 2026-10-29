import * as Keychain from 'react-native-keychain';
import {z} from 'zod';

const SERVICIO = 'com.plutonio.sesion';
const USUARIO = 'token';

const esquemaCredenciales = z.object({
  token: z.string(),
  /** Null si el servidor no entregó refresh token (versiones viejas de Fluor). */
  tokenRenovacion: z.string().nullable(),
});

export type Credenciales = z.infer<typeof esquemaCredenciales>;

/**
 * Guarda los tokens en el llavero del sistema (Keychain en iOS, Keystore en
 * Android). Nunca van en MMKV ni en AsyncStorage.
 */
export const guardarCredenciales = async (credenciales: Credenciales) => {
  await Keychain.setGenericPassword(USUARIO, JSON.stringify(credenciales), {
    service: SERVICIO,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
};

/** Null si no hay credenciales o tienen otra forma (p. ej. las guardó una versión anterior). */
export const leerCredenciales = async (): Promise<Credenciales | null> => {
  const guardado = await Keychain.getGenericPassword({service: SERVICIO});
  if (!guardado) return null;
  try {
    const credenciales = esquemaCredenciales.safeParse(
      JSON.parse(guardado.password),
    );
    return credenciales.success ? credenciales.data : null;
  } catch {
    return null;
  }
};

export const borrarCredenciales = async () => {
  await Keychain.resetGenericPassword({service: SERVICIO});
};
