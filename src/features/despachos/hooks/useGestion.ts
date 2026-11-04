import {useMutation, useQueryClient} from '@tanstack/react-query';

import {v4 as uuidV4} from 'uuid';

import {borrarEvidencia, guardarEvidencia} from '@/core/archivos';
import {escribir} from '@/core/db';
import {sincronizarAhora} from '@/core/sync';

import {
  registrarEntrega,
  registrarNovedad,
  registrarTerminar,
  type Evidencia,
} from '../db/gestion';
import {
  CONFIGURACION_ENTREGA_PROVISIONAL,
  TIPOS_NOVEDAD_PROVISIONALES,
  type DatosEntrega,
  type Ubicacion,
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

export type Entrega = {
  datos: DatosEntrega;
  /** Archivos temporales de la cámara. */
  fotos: readonly string[];
  /** PNG temporal de la firma. */
  firma: string | null;
  ubicacion: Ubicacion | null;
};

/**
 * Pasa las evidencias de la caché a documentos antes de guardar. Si la
 * entrega no se guarda, se borran: no quedan archivos sin operación.
 */
const moverEvidencias = async ({fotos, firma}: Entrega) => {
  const pendientes = [
    ...fotos.map(uri => ({
      tipo: 'foto' as const,
      uri,
      extension: 'jpg' as const,
    })),
    ...(firma
      ? [{tipo: 'firma' as const, uri: firma, extension: 'png' as const}]
      : []),
  ];
  const guardadas: Evidencia[] = [];
  try {
    for (const {tipo, uri, extension} of pendientes) {
      const {ruta, bytes} = await guardarEvidencia(uri, uuidV4(), extension);
      guardadas.push({tipo, ruta, bytes});
    }
  } catch (error) {
    await Promise.all(guardadas.map(e => borrarEvidencia(e.ruta)));
    throw error;
  }
  return guardadas;
};

export const useEntregar = (tenantDespachoId: number, codigoGuia: number) => {
  const configuracion = useConfiguracionEntrega();
  return useGuardarLocal(async (usuarioId, entrega: Entrega) => {
    const evidencias = await moverEvidencias(entrega);
    try {
      return await escribir(tx =>
        registrarEntrega(
          tx,
          {
            usuarioId,
            tenantDespachoId,
            codigoGuia,
            ubicacion: entrega.ubicacion,
          },
          entrega.datos,
          configuracion,
          evidencias,
        ),
      );
    } catch (error) {
      await Promise.all(evidencias.map(e => borrarEvidencia(e.ruta)));
      throw error;
    }
  });
};

export const useReportarNovedad = (
  tenantDespachoId: number,
  codigoGuia: number,
) =>
  useGuardarLocal(
    (
      usuarioId,
      {
        ubicacion,
        ...datos
      }: {tipo: string; descripcion?: string; ubicacion: Ubicacion | null},
    ) =>
      escribir(tx =>
        registrarNovedad(
          tx,
          {usuarioId, tenantDespachoId, codigoGuia, ubicacion},
          datos,
        ),
      ),
  );

export const useTerminarDespacho = (tenantDespachoId: number) =>
  useGuardarLocal((usuarioId, _: void) =>
    escribir(tx => registrarTerminar(tx, {usuarioId, tenantDespachoId})),
  );
