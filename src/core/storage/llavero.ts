import * as Keychain from 'react-native-keychain';

const SERVICIO = 'com.plutonio.sesion';
const USUARIO = 'token';

/**
 * Guarda el token de acceso en el llavero del sistema (Keychain en iOS,
 * Keystore en Android). Nunca va en MMKV ni en AsyncStorage.
 */
export const guardarToken = async (token: string) => {
  await Keychain.setGenericPassword(USUARIO, token, {
    service: SERVICIO,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
};

export const leerToken = async (): Promise<string | null> => {
  const credencial = await Keychain.getGenericPassword({service: SERVICIO});
  return credencial ? credencial.password : null;
};

export const borrarToken = async () => {
  await Keychain.resetGenericPassword({service: SERVICIO});
};
