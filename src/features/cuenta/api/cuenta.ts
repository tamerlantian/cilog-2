import {cliente} from '@/core/api';

/**
 * Elimina la cuenta en Fluor. Google Play lo exige a toda app que permite
 * crear cuentas. Fluor solo deja borrar la del usuario del token.
 */
export const eliminarCuentaApi = async (usuarioId: number) => {
  await cliente.delete(`/auth/seguridad/usuario/${usuarioId}`);
};
