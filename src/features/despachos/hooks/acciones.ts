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
import {descargarTiposNovedadApi} from '../api/novedad';
import {
  fusionarGuias,
  guardarAsignacion,
  guardarAsignaciones,
  guardarTiposNovedad,
  leerDespacho,
  leerDespachos,
  leerTiposNovedad,
  quitarDespacho,
} from '../db/repositorio';

/**
 * Casos de uso de despachos: combinan Fluor y la base local. Los hooks de
 * React los envuelven; aquí no hay React para poder probarlos solos.
 */

/**
 * Baja los tipos de novedad de la empresa del despacho y reemplaza los
 * guardados. Lanza el error: quien llama decide si le importa.
 */
export const descargarTiposNovedad = async (tenantDespachoId: number) => {
  const despacho = await leer(db => leerDespacho(db, tenantDespachoId));
  if (!despacho) return;
  const tipos = await descargarTiposNovedadApi(tenantDespachoId);
  await escribir(tx => guardarTiposNovedad(tx, despacho.tenantId, tipos));
};

/** Los tipos son un extra de la descarga: si fallan, quedan los que había. */
const intentarTiposNovedad = async (tenantDespachoId: number) => {
  try {
    await descargarTiposNovedad(tenantDespachoId);
  } catch {
    // Se reintenta en la próxima descarga o desde la pantalla de novedad.
  }
};

/**
 * Baja las guías del despacho y las fusiona con lo local, junto con los tipos
 * de novedad de su empresa. Si Fluor ya no lo tiene asignado al usuario
 * (404), se quita o queda como liberado.
 */
export const descargarDespacho = async (
  usuarioId: number,
  tenantDespachoId: number,
) => {
  try {
    const descarga = await descargarGuiasApi(tenantDespachoId);
    await escribir(tx => fusionarGuias(tx, usuarioId, descarga));
    await intentarTiposNovedad(tenantDespachoId);
    return 'actualizado' as const;
  } catch (error) {
    if (traducirError(error).codigo !== 'NO_ENCONTRADO') throw error;
    return escribir(tx => quitarDespacho(tx, tenantDespachoId));
  }
};

/**
 * Actualiza la lista de despachos asignados y baja las guías de los que nunca
 * se han descargado. A los ya descargados sin tipos de novedad (p. ej. de una
 * versión anterior de la app) les baja los tipos. Sin señal lanza el error y
 * lo local queda como estaba.
 */
export const actualizarDespachos = async (usuarioId: number) => {
  const asignaciones = await listarAsignacionesApi();
  await escribir(tx => guardarAsignaciones(tx, usuarioId, asignaciones));
  const locales = await leer(db => leerDespachos(db, usuarioId));
  for (const despacho of locales) {
    if (despacho.liberado) continue;
    if (despacho.descargadoEn === null) {
      await descargarDespacho(usuarioId, despacho.tenantDespachoId);
    } else {
      const tipos = await leer(db =>
        leerTiposNovedad(db, despacho.tenantDespachoId),
      );
      if (tipos.length === 0) {
        await intentarTiposNovedad(despacho.tenantDespachoId);
      }
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
