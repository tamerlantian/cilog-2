import {useMutation} from '@tanstack/react-query';

import {mensajeUsuario, traducirError} from '@/core/api/errores';
import {useSesion} from '@/core/sesion';
import {mostrarError} from '@/ui';

import {iniciarSesionApi} from './api';
import type {FormularioLogin} from './esquemas';

/** Fluor responde 403 con `is_verified: false` cuando falta confirmar el correo. */
export const esCuentaNoVerificada = (error: unknown) =>
  traducirError(error).extras.is_verified === false;

export const useIniciarSesion = () => {
  const iniciarSesion = useSesion(s => s.iniciarSesion);

  return useMutation({
    mutationFn: async ({email, clave}: FormularioLogin) => {
      const respuesta = await iniciarSesionApi(email, clave);
      await iniciarSesion(respuesta.access_token, respuesta.user);
    },
    // La cuenta sin verificar tiene su propio aviso en la pantalla, con la acción para resolverlo.
    onError: error => {
      if (!esCuentaNoVerificada(error)) mostrarError(mensajeUsuario(error));
    },
  });
};
