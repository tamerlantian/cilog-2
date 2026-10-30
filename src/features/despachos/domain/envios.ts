/** Estados de la cola que ve el conductor (docs/offline.md §6.1). */
export type EstadoEnvio =
  'pendiente' | 'enviando' | 'pausada' | 'rechazada' | 'conflicto';

export type TonoEnvio = 'neutro' | 'info' | 'advertencia' | 'peligro';

export const PRESENTACION_ENVIO: Record<
  EstadoEnvio,
  {texto: string; tono: TonoEnvio}
> = {
  pendiente: {texto: 'Por enviar', tono: 'neutro'},
  enviando: {texto: 'Enviando…', tono: 'info'},
  pausada: {texto: 'Inicia sesión para enviar', tono: 'advertencia'},
  rechazada: {texto: 'No se pudo enviar', tono: 'peligro'},
  conflicto: {texto: 'Ya estaba gestionada', tono: 'advertencia'},
};

const NOMBRE_TIPO: Record<string, string> = {
  entrega: 'Entrega',
  novedad: 'Novedad',
  foto: 'Foto',
  firma: 'Firma',
  terminar: 'Terminar despacho',
};

export const nombreTipo = (tipo: string) => NOMBRE_TIPO[tipo] ?? tipo;

/** Las que esperan una decisión del conductor (reintentar o descartar). */
export const requiereAccion = (estado: EstadoEnvio) =>
  estado === 'rechazada' || estado === 'conflicto';

/** Más de esto sin confirmar merece un aviso destacado (§13). */
export const LIMITE_ATRASO_MS = 24 * 60 * 60 * 1000;

export type ResumenEnvios = Partial<Record<EstadoEnvio, number>>;

export type EstadoBarra =
  | {tipo: 'oculta'}
  | {tipo: 'enviando'; total: number}
  | {tipo: 'problemas'; problemas: number; total: number}
  | {tipo: 'pausada'; total: number}
  | {tipo: 'porEnviar'; total: number; sinConexion: boolean};

/** Qué dice la barra de envíos. Lo que pide acción del conductor va primero. */
export const estadoBarra = (
  resumen: ResumenEnvios,
  sinConexion: boolean,
): EstadoBarra => {
  const n = (estado: EstadoEnvio) => resumen[estado] ?? 0;
  const total =
    n('pendiente') +
    n('enviando') +
    n('pausada') +
    n('rechazada') +
    n('conflicto');
  if (total === 0) return {tipo: 'oculta'};
  const problemas = n('rechazada') + n('conflicto');
  if (problemas > 0) return {tipo: 'problemas', problemas, total};
  if (n('pausada') > 0) return {tipo: 'pausada', total};
  if (n('enviando') > 0) return {tipo: 'enviando', total};
  return {tipo: 'porEnviar', total, sinConexion};
};

export const plural = (n: number, singular: string, varios: string) =>
  `${n} ${n === 1 ? singular : varios}`;
