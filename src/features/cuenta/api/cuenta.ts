import {cliente} from '@/core/api';

/**
 * Elimina la cuenta del usuario del token en Fluor (Google Play lo exige a
 * toda app que permite crear cuentas). Pide la clave: si es incorrecta Fluor
 * responde 401, que aquí no significa sesión vencida.
 */
export const eliminarCuentaApi = async (clave: string) => {
  await cliente.delete('/auth/user/eliminar', {
    data: {clave},
    sinRenovar: true,
  });
};
