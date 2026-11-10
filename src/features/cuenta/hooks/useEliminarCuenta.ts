import {useMutation} from '@tanstack/react-query';

import {mensajeUsuario} from '@/core/api';
import {borrarEvidencia} from '@/core/archivos';
import {borrarDatosDeUsuario, escribir} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {mostrarError} from '@/ui';

import {eliminarCuentaApi} from '../api/cuenta';

const AVISO_CUENTA_ELIMINADA = 'Tu cuenta fue eliminada.';

/**
 * Elimina la cuenta en Fluor y después todo lo suyo del teléfono. Necesita
 * señal: sin respuesta de Fluor no se borra nada.
 */
export const useEliminarCuenta = () => {
  const usuarioId = useSesion(s => s.usuario?.id ?? null);
  const cerrarSesion = useSesion(s => s.cerrarSesion);

  return useMutation({
    mutationFn: async () => {
      if (usuarioId === null) throw new Error('No hay una sesión abierta.');
      await eliminarCuentaApi(usuarioId);
      const rutas = await escribir(tx => borrarDatosDeUsuario(tx, usuarioId));
      await Promise.all(rutas.map(borrarEvidencia));
    },
    // Sin señal debe fallar con su mensaje, no quedar en pausa.
    networkMode: 'always',
    onSuccess: () => cerrarSesion(AVISO_CUENTA_ELIMINADA),
    onError: error => mostrarError(mensajeUsuario(error)),
  });
};
