import {useMutation, useQueryClient} from '@tanstack/react-query';

import {mensajeUsuario, traducirError} from '@/core/api';

import type {DatosFormularioVincular} from '../domain/formularios';
import {
  actualizarDespachos,
  descargarDespacho,
  desvincularDespacho,
  vincularDespacho,
} from './acciones';
import {clavesDespachos} from './claves';
import {useUsuarioId} from './local';

/**
 * Lo que toca la base local refresca todas las consultas de la feature.
 * `networkMode: 'always'`: sin señal fallan enseguida con SIN_CONEXION en vez
 * de quedar en pausa esperando la red.
 */
const useRefrescar = () => {
  const consultas = useQueryClient();
  return () => consultas.invalidateQueries({queryKey: clavesDespachos.todo});
};

const conUsuario = (usuarioId: number | null) => {
  if (usuarioId === null) throw new Error('No hay sesión.');
  return usuarioId;
};

export const useActualizarDespachos = () => {
  const usuarioId = useUsuarioId();
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: () => actualizarDespachos(conUsuario(usuarioId)),
    onSettled: refrescar,
    networkMode: 'always',
  });
};

export const useDescargarDespacho = (tenantDespachoId: number) => {
  const usuarioId = useUsuarioId();
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: () =>
      descargarDespacho(conUsuario(usuarioId), tenantDespachoId),
    onSettled: refrescar,
    networkMode: 'always',
  });
};

/** Fluor no dice cuál de los tres datos falló (404) ni de quién es (409). */
export const mensajeVincular = (error: unknown) => {
  const {codigo} = traducirError(error);
  if (codigo === 'NO_ENCONTRADO') {
    return 'No encontramos un despacho activo con esos datos. Revisa el operador, el número y el token.';
  }
  if (codigo === 'CONFLICTO') {
    return 'Este despacho ya está asignado a otro conductor.';
  }
  return mensajeUsuario(error);
};

export const useVincularDespacho = () => {
  const usuarioId = useUsuarioId();
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (datos: DatosFormularioVincular) =>
      vincularDespacho(conUsuario(usuarioId), {
        tenantId: datos.operador,
        codigoDespacho: datos.despacho,
        token: datos.token,
      }),
    onSettled: refrescar,
    networkMode: 'always',
  });
};

export const useDesvincularDespacho = (tenantDespachoId: number) => {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: () => desvincularDespacho(tenantDespachoId),
    onSettled: refrescar,
    networkMode: 'always',
  });
};
