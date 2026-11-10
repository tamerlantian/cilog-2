import {eq, inArray} from 'drizzle-orm';

import type {Consulta} from './base';
import {archivos, despachos, operaciones} from './esquema';

/**
 * Borra del teléfono todo lo de un usuario: despachos con sus guías y la cola
 * con sus archivos. Devuelve las rutas de las evidencias para borrar los
 * ficheros fuera de la transacción.
 */
export const borrarDatosDeUsuario = async (
  tx: Consulta,
  usuarioId: number,
): Promise<string[]> => {
  const ids = tx
    .select({id: operaciones.idOperacion})
    .from(operaciones)
    .where(eq(operaciones.usuarioId, usuarioId));
  const rutas = await tx
    .select({ruta: archivos.ruta})
    .from(archivos)
    .where(inArray(archivos.idOperacion, ids));
  // Archivos y guías caen en cascada.
  await tx.delete(operaciones).where(eq(operaciones.usuarioId, usuarioId));
  await tx.delete(despachos).where(eq(despachos.usuarioId, usuarioId));
  return rutas.map(fila => fila.ruta);
};
