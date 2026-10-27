import {useMutation} from '@tanstack/react-query';

import {mensajeUsuario} from '@/core/api/errores';
import {useSesion} from '@/core/sesion';
import {mostrarError} from '@/ui';

import {iniciarSesionApi} from './api';
import type {FormularioLogin} from './esquemas';

export const useIniciarSesion = () => {
  const iniciarSesion = useSesion(s => s.iniciarSesion);

  return useMutation({
    mutationFn: async ({email, clave}: FormularioLogin) => {
      const respuesta = await iniciarSesionApi(email, clave);
      await iniciarSesion(respuesta.access_token, respuesta.user);
    },
    onError: error => mostrarError(mensajeUsuario(error)),
  });
};
