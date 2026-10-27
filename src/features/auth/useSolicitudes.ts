import {useMutation} from '@tanstack/react-query';

import {mensajeUsuario} from '@/core/api/errores';
import {mostrarError} from '@/ui';

import {
  recuperarClaveApi,
  registrarApi,
  reenviarVerificacionApi,
  type DatosRegistro,
} from './api';

/** Registro, recuperación y reenvío son públicos: muestran el error del servidor tal cual. */
const alFallar = (error: unknown) => mostrarError(mensajeUsuario(error));

export const useRegistrar = () =>
  useMutation({
    mutationFn: (datos: DatosRegistro) => registrarApi(datos),
    onError: alFallar,
  });

export type TipoSolicitudCorreo = 'recuperarClave' | 'reenviarVerificacion';

export const useSolicitarCorreo = (tipo: TipoSolicitudCorreo) =>
  useMutation({
    mutationFn: ({
      email,
      turnstileToken,
    }: {
      email: string;
      turnstileToken?: string | undefined;
    }) =>
      tipo === 'recuperarClave'
        ? recuperarClaveApi(email, {turnstileToken})
        : reenviarVerificacionApi(email, {turnstileToken}),
    onError: alFallar,
  });
