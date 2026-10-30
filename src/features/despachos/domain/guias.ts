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
