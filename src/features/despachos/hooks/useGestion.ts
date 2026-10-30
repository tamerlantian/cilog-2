import {useMutation, useQueryClient} from '@tanstack/react-query';

import {escribir} from '@/core/db';
import {sincronizarAhora} from '@/core/sync';

import {
  registrarEntrega,
  registrarNovedad,
  registrarTerminar,
} from '../db/gestion';
import {
  CONFIGURACION_ENTREGA_PROVISIONAL,
  TIPOS_NOVEDAD_PROVISIONALES,
  type DatosEntrega,
} from '../domain/gestion';
import {clavesDespachos} from './claves';
import {useUsuarioId} from './local';

/** Hasta que Fluor publique la configuración y el catálogo, valores fijos. */
export const useConfiguracionEntrega = () => CONFIGURACION_ENTREGA_PROVISIONAL;
export const useTiposNovedad = () => TIPOS_NOVEDAD_PROVISIONALES;

/**
 * Guardar es local y no espera la red: se registra, se encola y se pide un
 * envío sin esperarlo. Con señal sale al instante; sin ella, queda en la cola.
 */
const useGuardarLocal = <T>(
  guardar: (usuarioId: number, datos: T) => Promise<string>,
) => {
  const usuarioId = useUsuarioId();
  const consultas = useQueryClient();
  return useMutation({
    mutationFn: async (datos: T) => {
      if (usuarioId === null) throw new Error('No hay sesión.');
      const idOperacion = await guardar(usuarioId, datos);
      sincronizarAhora();
      return idOperacion;
    },
    onSettled: () =>
      consultas.invalidateQueries({queryKey: clavesDespachos.todo}),
    networkMode: 'always',
  });
};

export const useEntregar = (tenantDespachoId: number, codigoGuia: number) => {
  const configuracion = useConfiguracionEntrega();
  return useGuardarLocal((usuarioId, datos: DatosEntrega) =>
    escribir(tx =>
      registrarEntrega(
        tx,
        {usuarioId, tenantDespachoId, codigoGuia},
        datos,
        configuracion,
      ),
    ),
  );
};

export const useReportarNovedad = (
  tenantDespachoId: number,
  codigoGuia: number,
) =>
  useGuardarLocal((usuarioId, datos: {tipo: string; descripcion?: string}) =>
    escribir(tx =>
      registrarNovedad(tx, {usuarioId, tenantDespachoId, codigoGuia}, datos),
    ),
  );

export const useTerminarDespacho = (tenantDespachoId: number) =>
  useGuardarLocal((usuarioId, _: void) =>
    escribir(tx => registrarTerminar(tx, {usuarioId, tenantDespachoId})),
  );
