import {ErrorApi, traducirError} from '@/core/api';
import {escribir, leer} from '@/core/db';
import {sinConfirmarDelDespacho} from '@/core/sync';

import {
  descargarGuiasApi,
  desvincularDespachoApi,
  listarAsignacionesApi,
  vincularDespachoApi,
  type DatosVincular,
} from '../api/despachos';
import {
  fusionarGuias,
  guardarAsignacion,
  guardarAsignaciones,
  leerDespachos,
  quitarDespacho,
} from '../db/repositorio';

/**
 * Casos de uso de despachos: combinan Fluor y la base local. Los hooks de
 * React los envuelven; aquí no hay React para poder probarlos solos.
 */

/**
 * Baja las guías del despacho y las fusiona con lo local. Si Fluor ya no lo
 * tiene asignado al usuario (404), se quita o queda como liberado.
 */
export const descargarDespacho = async (
  usuarioId: number,
  tenantDespachoId: number,
) => {
  try {
    const descarga = await descargarGuiasApi(tenantDespachoId);
    await escribir(tx => fusionarGuias(tx, usuarioId, descarga));
    return 'actualizado' as const;
  } catch (error) {
    if (traducirError(error).codigo !== 'NO_ENCONTRADO') throw error;
    return escribir(tx => quitarDespacho(tx, tenantDespachoId));
  }
};

/**
 * Actualiza la lista de despachos asignados y baja las guías de los que nunca
 * se han descargado. Sin señal lanza el error y lo local queda como estaba.
 */
export const actualizarDespachos = async (usuarioId: number) => {
  const asignaciones = await listarAsignacionesApi();
  await escribir(tx => guardarAsignaciones(tx, usuarioId, asignaciones));
  const locales = await leer(db => leerDespachos(db, usuarioId));
  for (const despacho of locales) {
    if (despacho.descargadoEn === null && !despacho.liberado) {
      await descargarDespacho(usuarioId, despacho.tenantDespachoId);
    }
  }
};

/**
 * Asigna el despacho al usuario y baja sus guías. Si la descarga falla por
 * red, el despacho queda vinculado y las guías se bajan al refrescar.
 */
export const vincularDespacho = async (
  usuarioId: number,
  datos: DatosVincular,
) => {
  const asignacion = await vincularDespachoApi(datos);
  await escribir(tx => guardarAsignacion(tx, usuarioId, asignacion));
  try {
    await descargarDespacho(usuarioId, asignacion.id);
  } catch {
    // Vinculado igual; las guías se bajan al refrescar.
  }
  return asignacion;
};

/** Libera el despacho en Fluor y lo borra del teléfono. No se permite con envíos pendientes. */
export const desvincularDespacho = async (tenantDespachoId: number) => {
  const pendientes = await leer(db =>
    sinConfirmarDelDespacho(db, tenantDespachoId),
  );
  if (pendientes > 0) {
    throw new ErrorApi({
      codigo: 'CONFLICTO',
      mensaje: `Tienes ${pendientes} ${pendientes === 1 ? 'envío pendiente' : 'envíos pendientes'} de este despacho. Envíalos antes de desvincularlo.`,
    });
  }
  try {
    await desvincularDespachoApi(tenantDespachoId);
  } catch (error) {
    // Si Fluor ya no lo tiene, el resultado es el mismo.
    if (traducirError(error).codigo !== 'NO_ENCONTRADO') throw error;
  }
  await escribir(tx => quitarDespacho(tx, tenantDespachoId));
};
