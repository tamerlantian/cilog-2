import {useMutation} from '@tanstack/react-query';

import {mensajeUsuario, traducirError} from '@/core/api';
import {borrarEvidencia} from '@/core/archivos';
import {borrarDatosDeUsuario, escribir} from '@/core/db';
import {useSesion} from '@/core/sesion';
import {mostrarError} from '@/ui';

import {eliminarCuentaApi} from '../api/cuenta';

const AVISO_CUENTA_ELIMINADA = 'Tu cuenta fue eliminada.';

/** Clave incorrecta: se muestra en el campo, no como toast. */
export const esClaveIncorrecta = (error: unknown) =>
  error !== null && traducirError(error).estado === 401;

/** El 409 trae las empresas donde el usuario es el único control. */
const mensajeError = (error: unknown) => {
  const {extras} = traducirError(error);
  const empresas = Array.isArray(extras.empresas)
    ? extras.empresas.filter(e => typeof e === 'string')
    : [];
  const mensaje = mensajeUsuario(error);
  return empresas.length > 0 ? `${mensaje}: ${empresas.join(', ')}.` : mensaje;
};

/**
 * Elimina la cuenta en Fluor y después todo lo suyo del teléfono. Necesita
 * señal: sin respuesta de Fluor no se borra nada.
 */
export const useEliminarCuenta = () => {
  const usuarioId = useSesion(s => s.usuario?.id ?? null);
  const cerrarSesion = useSesion(s => s.cerrarSesion);

  return useMutation({
    mutationFn: async (clave: string) => {
      if (usuarioId === null) throw new Error('No hay una sesión abierta.');
      await eliminarCuentaApi(clave);
      const rutas = await escribir(tx => borrarDatosDeUsuario(tx, usuarioId));
      await Promise.all(rutas.map(borrarEvidencia));
    },
    // Sin señal debe fallar con su mensaje, no quedar en pausa.
    networkMode: 'always',
    onSuccess: () => cerrarSesion(AVISO_CUENTA_ELIMINADA),
    onError: error => {
      if (!esClaveIncorrecta(error)) mostrarError(mensajeError(error));
    },
  });
};
