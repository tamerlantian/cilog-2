import {ErrorApi, traducirError} from '@/core/api';
import {leer} from '@/core/db';
import type {Enviador} from '@/core/sync';

import {entregarGuiaApi} from '../api/entrega';
import {leerDespacho} from '../db/repositorio';

/**
 * Fluor no recibe `id_operacion`: si la guía ya estaba entregada responde 409
 * con `entrega: true`, sea un reenvío nuestro o la entrega de otra persona
 * (docs/offline.md §7.2 y §7.3).
 */
const yaEntregada = (error: ErrorApi) =>
  error.estado === 409 && error.extras.entrega === true;

/**
 * Envía una entrega guardada en la cola. Un 409 con `entrega: true` cuenta
 * como recibida; los archivos se conservan por si eran de otra entrega. Si
 * Fluor guardó la entrega pero no algún archivo, también se conservan (§8).
 */
export const enviarEntrega: Enviador = async ({
  tenantDespachoId,
  cuerpo,
  archivos,
}) => {
  const despacho =
    tenantDespachoId === null
      ? null
      : await leer(db => leerDespacho(db, tenantDespachoId));
  if (!despacho) {
    throw new ErrorApi({
      codigo: 'NO_ENCONTRADO',
      mensaje: 'El despacho de esta entrega ya no está en el teléfono.',
    });
  }

  try {
    const respuesta = await entregarGuiaApi({
      tenantId: despacho.tenantId,
      datos: cuerpo,
      archivos,
    });
    return {conservarArchivos: respuesta.ficheros_con_error > 0};
  } catch (error) {
    const errorApi = traducirError(error);
    if (yaEntregada(errorApi)) return {conservarArchivos: true};
    // Otro 409 ("La guía no está despachada") no es que alguien la gestionó:
    // Fluor no la acepta y el conductor debe ver el motivo.
    if (errorApi.estado === 409) {
      throw new ErrorApi({
        codigo: 'PETICION_INVALIDA',
        mensaje: errorApi.message,
        estado: errorApi.estado,
        requestId: errorApi.requestId,
        extras: errorApi.extras,
      });
    }
    throw errorApi;
  }
};

/** Lo que la feature sabe enviar. Novedad y terminar esperan sus endpoints en Fluor. */
export const enviadoresDespachos: Record<string, Enviador> = {
  entrega: enviarEntrega,
};
