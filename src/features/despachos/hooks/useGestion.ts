import {useMutation, useQueryClient} from '@tanstack/react-query';

import {v4 as uuidV4} from 'uuid';

import {
  borrarEvidencia,
  copiarEvidencia,
  guardarEvidencia,
} from '@/core/archivos';
import {escribir} from '@/core/db';
import {sincronizarAhora} from '@/core/sync';

import {
  registrarEntregas,
  registrarNovedades,
  registrarTerminar,
  type Evidencia,
} from '../db/gestion';
import {
  CONFIGURACION_ENTREGA_PROVISIONAL,
  type DatosEntrega,
  type DatosNovedad,
  type Ubicacion,
} from '../domain/gestion';
import {clavesDespachos} from './claves';
import {useUsuarioId} from './local';

/** Hasta que Fluor publique la configuración de entrega, valores fijos. */
export const useConfiguracionEntrega = () => CONFIGURACION_ENTREGA_PROVISIONAL;

/**
 * Guardar es local y no espera la red: se registra, se encola y se pide un
 * envío sin esperarlo. Con señal sale al instante; sin ella, queda en la cola.
 */
const useGuardarLocal = <T>(
  guardar: (usuarioId: number, datos: T) => Promise<string | string[]>,
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
 * Pasa las evidencias de la caché a documentos antes de guardar: una copia
 * por guía, porque cada entrega borra sus archivos al confirmarse (docs/
 * offline.md §8). Si la entrega no se guarda, se borran: no quedan archivos
 * sin operación.
 */
const moverEvidencias = async (
  {fotos, firma}: Pick<Entrega, 'fotos' | 'firma'>,
  guias: number,
) => {
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
  const porGuia: Evidencia[][] = Array.from({length: guias}, () => []);
  try {
    for (const {tipo, uri, extension} of pendientes) {
      const original = await guardarEvidencia(uri, uuidV4(), extension);
      porGuia[0]?.push({tipo, ...original});
      for (const copias of porGuia.slice(1)) {
        const copia = await copiarEvidencia(original.ruta, uuidV4(), extension);
        copias.push({tipo, ...copia});
      }
    }
  } catch (error) {
    await borrarTodas(porGuia);
    throw error;
  }
  return porGuia;
};

const borrarTodas = (evidencias: readonly (readonly Evidencia[])[]) =>
  Promise.all(evidencias.flat().map(e => borrarEvidencia(e.ruta)));

/** Una o varias guías del mismo despacho con la misma evidencia. */
export const useEntregar = (
  tenantDespachoId: number,
  codigosGuia: readonly number[],
) => {
  const configuracion = useConfiguracionEntrega();
  return useGuardarLocal(async (usuarioId, entrega: Entrega) => {
    const evidencias = await moverEvidencias(entrega, codigosGuia.length);
    try {
      return await escribir(tx =>
        registrarEntregas(
          tx,
          {
            usuarioId,
            tenantDespachoId,
            codigosGuia,
            ubicacion: entrega.ubicacion,
          },
          entrega.datos,
          configuracion,
          evidencias,
        ),
      );
    } catch (error) {
      await borrarTodas(evidencias);
      throw error;
    }
  });
};

export type Novedad = {
  datos: DatosNovedad;
  /** Archivos temporales de la cámara. */
  fotos: readonly string[];
  ubicacion: Ubicacion | null;
};

/** Una o varias guías del mismo despacho con la misma novedad y fotos. */
export const useReportarNovedad = (
  tenantDespachoId: number,
  codigosGuia: readonly number[],
) =>
  useGuardarLocal(async (usuarioId, novedad: Novedad) => {
    const fotos = await moverEvidencias(
      {fotos: novedad.fotos, firma: null},
      codigosGuia.length,
    );
    try {
      return await escribir(tx =>
        registrarNovedades(
          tx,
          {
            usuarioId,
            tenantDespachoId,
            codigosGuia,
            ubicacion: novedad.ubicacion,
          },
          novedad.datos,
          fotos,
        ),
      );
    } catch (error) {
      await borrarTodas(fotos);
      throw error;
    }
  });

export const useTerminarDespacho = (tenantDespachoId: number) =>
  useGuardarLocal((usuarioId, _: void) =>
    escribir(tx => registrarTerminar(tx, {usuarioId, tenantDespachoId})),
  );
