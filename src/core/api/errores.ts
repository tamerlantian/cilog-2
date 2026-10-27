import axios from 'axios';
import {z} from 'zod';

export type CodigoError =
  | 'SIN_CONEXION'
  | 'TIEMPO_AGOTADO'
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'PETICION_INVALIDA'
  | 'CONFLICTO'
  | 'VALIDACION'
  | 'LIMITE_EXCEDIDO'
  | 'SERVIDOR'
  | 'DESCONOCIDO';

export type DetalleValidacion = {campo: string; mensaje: string};

const CODIGOS_FLUOR: Record<string, CodigoError> = {
  UNAUTHORIZED: 'NO_AUTENTICADO',
  FORBIDDEN: 'SIN_PERMISO',
  NOT_FOUND: 'NO_ENCONTRADO',
  BAD_REQUEST: 'PETICION_INVALIDA',
  CONFLICT: 'CONFLICTO',
  VALIDATION_ERROR: 'VALIDACION',
  RATE_LIMIT_EXCEEDED: 'LIMITE_EXCEDIDO',
  INTERNAL_ERROR: 'SERVIDOR',
};

/** Forma de error que devuelve Fluor: {success:false, error:{code,message,...}, request_id}. */
const esquemaErrorFluor = z.object({
  error: z.looseObject({
    code: z.string(),
    message: z.string(),
    errores: z
      .array(z.looseObject({campo: z.string().optional(), mensaje: z.string()}))
      .optional(),
  }),
  request_id: z.string().optional(),
});

export class ErrorApi extends Error {
  readonly codigo: CodigoError;
  readonly estado: number | null;
  readonly requestId: string | null;
  readonly detalles: DetalleValidacion[];
  /** Segundos que indica `Retry-After` en un 429. */
  readonly reintentarEn: number | null;
  /** Campos extra del error (p. ej. `is_verified` en "Cuenta no verificada"). */
  readonly extras: Record<string, unknown>;

  constructor(datos: {
    codigo: CodigoError;
    mensaje: string;
    estado?: number | null;
    requestId?: string | null;
    detalles?: DetalleValidacion[];
    reintentarEn?: number | null;
    extras?: Record<string, unknown>;
  }) {
    super(datos.mensaje);
    this.name = 'ErrorApi';
    this.codigo = datos.codigo;
    this.estado = datos.estado ?? null;
    this.requestId = datos.requestId ?? null;
    this.detalles = datos.detalles ?? [];
    this.reintentarEn = datos.reintentarEn ?? null;
    this.extras = datos.extras ?? {};
  }
}

const codigoPorEstado = (estado: number): CodigoError => {
  if (estado === 401) return 'NO_AUTENTICADO';
  if (estado === 403) return 'SIN_PERMISO';
  if (estado === 404) return 'NO_ENCONTRADO';
  if (estado === 409) return 'CONFLICTO';
  if (estado === 422) return 'VALIDACION';
  if (estado === 429) return 'LIMITE_EXCEDIDO';
  if (estado >= 500) return 'SERVIDOR';
  return 'PETICION_INVALIDA';
};

/** Convierte cualquier cosa lanzada por axios o por código propio en un `ErrorApi`. */
export const traducirError = (error: unknown): ErrorApi => {
  if (error instanceof ErrorApi) return error;

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ErrorApi({codigo: 'TIEMPO_AGOTADO', mensaje: error.message});
    }
    if (!error.response) {
      return new ErrorApi({codigo: 'SIN_CONEXION', mensaje: error.message});
    }

    const {status, data, headers} = error.response;
    const reintento = Number(headers?.['retry-after']);
    const base = {
      estado: status,
      reintentarEn: Number.isFinite(reintento) ? reintento : null,
    };

    const cuerpo = esquemaErrorFluor.safeParse(data);
    if (cuerpo.success) {
      const {code, message, errores, ...extras} = cuerpo.data.error;
      return new ErrorApi({
        ...base,
        codigo: CODIGOS_FLUOR[code] ?? codigoPorEstado(status),
        mensaje: message,
        requestId: cuerpo.data.request_id ?? null,
        detalles: (errores ?? []).map(e => ({
          campo: e.campo ?? '',
          mensaje: e.mensaje,
        })),
        extras,
      });
    }

    return new ErrorApi({
      ...base,
      codigo: codigoPorEstado(status),
      mensaje: error.message,
    });
  }

  return new ErrorApi({
    codigo: 'DESCONOCIDO',
    mensaje: error instanceof Error ? error.message : 'Error desconocido',
  });
};

const MENSAJES_FIJOS: Partial<Record<CodigoError, string>> = {
  SIN_CONEXION: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  TIEMPO_AGOTADO:
    'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
  LIMITE_EXCEDIDO:
    'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
  SERVIDOR: 'Ocurrió un error en el servidor. Inténtalo más tarde.',
  DESCONOCIDO: 'Algo salió mal. Inténtalo de nuevo.',
};

/**
 * Texto para mostrar al usuario. Los errores de negocio de Fluor ya vienen en
 * español, así que se muestran tal cual; los técnicos usan un mensaje fijo.
 */
export const mensajeUsuario = (error: unknown): string => {
  const errorApi = traducirError(error);
  const fijo = MENSAJES_FIJOS[errorApi.codigo];
  if (fijo) return fijo;

  if (errorApi.codigo === 'VALIDACION' && errorApi.detalles.length > 0) {
    return errorApi.detalles.map(d => d.mensaje).join('\n');
  }
  return errorApi.message || MENSAJES_FIJOS.DESCONOCIDO!;
};
