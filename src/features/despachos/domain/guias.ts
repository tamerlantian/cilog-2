/** Datos de una guía que deciden su estado y la búsqueda; sin depender de la base. */
export type DatosGuia = {
  codigoGuia: number;
  documentoCliente: string | null;
  nombreDestinatario: string | null;
  direccionDestinatario: string | null;
  ciudadDestino: string | null;
  estadoEntregado: boolean;
  estadoNovedad: boolean;
  gestionLocal: 'entregada' | 'novedad' | null;
};

export type Situacion = 'pendiente' | 'entregada' | 'novedad';

/** Lo que hizo el conductor manda sobre lo que dijo Fluor en la última descarga. */
export const situacionGuia = (guia: DatosGuia): Situacion => {
  if (guia.gestionLocal) return guia.gestionLocal;
  if (guia.estadoEntregado) return 'entregada';
  if (guia.estadoNovedad) return 'novedad';
  return 'pendiente';
};

export type FiltroGuias = 'pendientes' | 'gestionadas' | 'todas';

/** Minúsculas y sin tildes, para que "medellin" encuentre "Medellín". */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const coincide = (guia: DatosGuia, busqueda: string) =>
  [
    String(guia.codigoGuia),
    guia.documentoCliente,
    guia.nombreDestinatario,
    guia.direccionDestinatario,
    guia.ciudadDestino,
  ].some(campo => campo && normalizar(campo).includes(busqueda));

export const filtrarGuias = <T extends DatosGuia>(
  guias: readonly T[],
  filtro: FiltroGuias,
  texto: string,
): T[] => {
  const busqueda = normalizar(texto.trim());
  return guias.filter(guia => {
    const pendiente = situacionGuia(guia) === 'pendiente';
    if (filtro === 'pendientes' && !pendiente) return false;
    if (filtro === 'gestionadas' && pendiente) return false;
    return busqueda === '' || coincide(guia, busqueda);
  });
};

/**
 * Lo que trae la etiqueta, listo para buscar. Las guías imprimen el número, a
 * veces entre comillas; null si es otra cosa (p. ej. el QR de un despacho).
 */
export const limpiarCodigoLeido = (crudo: string) => {
  const codigo = crudo.trim().replace(/^"|"$/g, '');
  return /^[A-Za-z0-9-]{1,40}$/.test(codigo) ? codigo : null;
};

/**
 * La guía que corresponde exactamente al código: por número o, si un solo
 * destinatario lo tiene, por documento del cliente.
 */
export const guiaConCodigo = <T extends DatosGuia>(
  guias: readonly T[],
  codigo: string,
): T | undefined => {
  const numero = /^\d+$/.test(codigo) ? Number(codigo) : null;
  const porNumero = guias.find(guia => guia.codigoGuia === numero);
  if (porNumero) return porNumero;
  const buscado = normalizar(codigo);
  const porDocumento = guias.filter(
    guia =>
      guia.documentoCliente !== null &&
      normalizar(guia.documentoCliente.trim()) === buscado,
  );
  return porDocumento.length === 1 ? porDocumento[0] : undefined;
};

export const contarGuias = (guias: readonly DatosGuia[]) => {
  const pendientes = guias.filter(
    guia => situacionGuia(guia) === 'pendiente',
  ).length;
  return {
    pendientes,
    gestionadas: guias.length - pendientes,
    todas: guias.length,
  };
};

/** Entregadas, con novedad y pendientes: el avance que se muestra al conductor. */
export const resumenGuias = (guias: readonly DatosGuia[]) => {
  const resumen = {entregadas: 0, novedades: 0, pendientes: 0};
  for (const guia of guias) {
    const situacion = situacionGuia(guia);
    if (situacion === 'entregada') resumen.entregadas += 1;
    else if (situacion === 'novedad') resumen.novedades += 1;
    else resumen.pendientes += 1;
  }
  return resumen;
};

/** La próxima guía por gestionar en el orden de la lista, sin contar la actual. */
export const siguientePendiente = <T extends DatosGuia>(
  guias: readonly T[],
  codigoActual: number,
): T | undefined =>
  guias.find(
    guia =>
      guia.codigoGuia !== codigoActual && situacionGuia(guia) === 'pendiente',
  );
