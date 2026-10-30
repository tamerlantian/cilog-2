import {mensajeUsuario, traducirError, type CodigoError} from '@/core/api';

/**
 * - transitorio: sin red, timeout, servidor caído o límite de peticiones. Se reintenta solo.
 * - sesion: la sesión no sirve (el cliente ya intentó renovarla). Se pausa la cola.
 * - conflicto: otro ya gestionó la entidad (409). Lo decide el conductor.
 * - definitivo: Fluor no acepta la operación (400, 403, 404, 422). Lo decide el conductor.
 */
export type ClaseFallo = 'transitorio' | 'sesion' | 'conflicto' | 'definitivo';

const CLASES: Partial<Record<CodigoError, ClaseFallo>> = {
  SIN_CONEXION: 'transitorio',
  TIEMPO_AGOTADO: 'transitorio',
  SERVIDOR: 'transitorio',
  LIMITE_EXCEDIDO: 'transitorio',
  NO_AUTENTICADO: 'sesion',
  CONFLICTO: 'conflicto',
};

export const clasificarFallo = (error: unknown) => {
  const errorApi = traducirError(error);
  return {
    clase: CLASES[errorApi.codigo] ?? 'definitivo',
    codigo: errorApi.codigo,
    mensaje: mensajeUsuario(errorApi),
    requestId: errorApi.requestId,
    reintentarEn: errorApi.reintentarEn,
  };
};
