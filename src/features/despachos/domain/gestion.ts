import {situacionGuia, type DatosGuia} from './guias';

/**
 * Reglas para entregar, reportar novedad y terminar. Puras: el caso de uso
 * las vuelve a revisar dentro de la transacción que guarda.
 */

/** Valores del legacy (`arrParentesco`): Fluor los recibe tal cual, incluso `EMPLADA`. */
export const PARENTESCOS = [
  {valor: 'TITULAR', titulo: 'Titular'},
  {valor: 'PORTERÍA', titulo: 'Portería'},
  {valor: 'VIGILANTE', titulo: 'Vigilante'},
  {valor: 'ENCARGADO_A', titulo: 'Encargado/a'},
  {valor: 'EMPLADA', titulo: 'Empleada'},
  {valor: 'PERSONAL', titulo: 'Personal'},
  {valor: 'VECINO_A', titulo: 'Vecino/a'},
  {valor: 'PAREJA', titulo: 'Pareja'},
  {valor: 'MAMÁ', titulo: 'Mamá'},
  {valor: 'PAPÁ', titulo: 'Papá'},
  {valor: 'HIJO', titulo: 'Hijo/a'},
  {valor: 'HIJASTRA', titulo: 'Hijastra'},
  {valor: 'HERMANO', titulo: 'Hermano/a'},
  {valor: 'ABUELO_A', titulo: 'Abuelo/a'},
  {valor: 'NIETO', titulo: 'Nieto/a'},
  {valor: 'TÍO_A', titulo: 'Tío/a'},
  {valor: 'PRIMO_A', titulo: 'Primo/a'},
  {valor: 'SOBRINO_A', titulo: 'Sobrino/a'},
  {valor: 'CUÑADO_A', titulo: 'Cuñado/a'},
  {valor: 'SUEGRA', titulo: 'Suegra'},
  {valor: 'NUERA', titulo: 'Nuera'},
  {valor: 'YERNO', titulo: 'Yerno'},
  {valor: 'MADRASTRA', titulo: 'Madrastra'},
  {valor: 'PADRASTRO', titulo: 'Padrastro'},
  {valor: 'MADRINA', titulo: 'Madrina'},
  {valor: 'MADRE_SUSTITUTA', titulo: 'Madre sustituta'},
  {valor: 'PADRE_SUSTITUTO', titulo: 'Padre sustituto'},
  {valor: 'ACUDIENTE', titulo: 'Acudiente'},
  {valor: 'CUIDADOR_A', titulo: 'Cuidador/a'},
  {valor: 'AMIGO_A', titulo: 'Amigo/a'},
  {valor: 'ENFERMERO_A', titulo: 'Enfermero/a'},
  {valor: 'MEDICO', titulo: 'Médico'},
  {valor: 'REGENTE', titulo: 'Regente'},
] as const;

/** Primeros en el selector, como al inicio de la lista de la app anterior. */
export const PARENTESCOS_FRECUENTES = ['TITULAR', 'PORTERÍA', 'VIGILANTE'];

/**
 * Lo que el conductor cobra al entregar: `vr_cobro_entrega`, como en la app
 * anterior (que no mostraba el recaudo). Si el recaudo también se cobra en la
 * puerta está pendiente de confirmar con operaciones (docs/contratos-fluor.md).
 */
export const aCobrar = (guia: {vrCobroEntrega: number}) => guia.vrCobroEntrega;

export type TipoNovedad = {codigo: string; nombre: string};

/**
 * PROVISIONAL hasta `GET /tte/novedad-tipo/descargar` (docs/contratos-fluor.md
 * §7). En Fluor los tipos son de cada empresa; estos códigos no existen allá,
 * así que hay que cambiarlos por el catálogo real antes de activar el envío.
 */
export const TIPOS_NOVEDAD_PROVISIONALES: readonly TipoNovedad[] = [
  {codigo: 'AUSENTE', nombre: 'Destinatario ausente'},
  {codigo: 'DIRECCION', nombre: 'Dirección errada o incompleta'},
  {codigo: 'CERRADO', nombre: 'Establecimiento cerrado'},
  {codigo: 'RECHAZO', nombre: 'El destinatario no la recibe'},
  {codigo: 'AVERIA', nombre: 'Mercancía averiada'},
  {codigo: 'OTRO', nombre: 'Otro'},
];

export type ConfiguracionEntrega = {
  exigeFoto: boolean;
  exigeFirma: boolean;
  /** Si se puede entregar una guía que ya tiene novedad. */
  entregaConNovedad: boolean;
};

/** PROVISIONAL hasta `GET /tte/configuracion/entrega` (docs/contratos-fluor.md §9). */
export const CONFIGURACION_ENTREGA_PROVISIONAL: ConfiguracionEntrega = {
  exigeFoto: false,
  exigeFirma: false,
  entregaConNovedad: false,
};

export const LARGO_MAXIMO_DESCRIPCION = 2000;

/** Fotos por entrega, como en la app anterior. */
export const LIMITE_FOTOS = 4;

/** Lo que la empresa exige y falta para confirmar la entrega; null si está completa. */
export const evidenciaFaltante = (
  configuracion: ConfiguracionEntrega,
  evidencia: {fotos: number; firma: boolean},
) => {
  if (configuracion.exigeFoto && evidencia.fotos === 0) {
    return 'La empresa exige al menos una foto de la entrega.';
  }
  if (configuracion.exigeFirma && !evidencia.firma) {
    return 'La empresa exige la firma de quien recibe.';
  }
  return null;
};

type Permiso = {permitido: true} | {permitido: false; motivo: string};

const permitido: Permiso = {permitido: true};
const negado = (motivo: string): Permiso => ({permitido: false, motivo});

type GuiaGestion = DatosGuia & {retirada: boolean};
type DespachoGestion = {liberado: boolean; terminadoEn: number | null};

const bloqueoDespacho = (despacho: DespachoGestion) => {
  if (despacho.terminadoEn !== null)
    return negado('El despacho ya está terminado.');
  if (despacho.liberado) {
    return negado('La empresa liberó este despacho.');
  }
  return null;
};

export const puedeEntregar = (
  despacho: DespachoGestion,
  guia: GuiaGestion,
  configuracion: ConfiguracionEntrega,
): Permiso => {
  const bloqueo = bloqueoDespacho(despacho);
  if (bloqueo) return bloqueo;
  if (guia.retirada) return negado('La empresa sacó esta guía del despacho.');
  const situacion = situacionGuia(guia);
  if (situacion === 'entregada') return negado('La guía ya está entregada.');
  if (situacion === 'novedad' && !configuracion.entregaConNovedad) {
    return negado('La guía tiene novedad y la empresa no permite entregarla.');
  }
  return permitido;
};

export const puedeReportarNovedad = (
  despacho: DespachoGestion,
  guia: GuiaGestion,
): Permiso => {
  const bloqueo = bloqueoDespacho(despacho);
  if (bloqueo) return bloqueo;
  if (guia.retirada) return negado('La empresa sacó esta guía del despacho.');
  if (situacionGuia(guia) === 'entregada') {
    return negado('La guía ya está entregada.');
  }
  return permitido;
};

/**
 * Terminar exige que no quede ninguna guía pendiente y que todo lo demás ya
 * haya llegado a Fluor (docs/offline.md §17): así la empresa recibe el
 * despacho completo y no a medias.
 */
export const puedeTerminar = (
  despacho: DespachoGestion & {porEnviar: number},
  guias: readonly GuiaGestion[],
): Permiso => {
  const bloqueo = bloqueoDespacho(despacho);
  if (bloqueo) return bloqueo;
  if (guias.length === 0) return negado('El despacho no tiene guías.');
  const pendientes = guias.filter(
    guia => !guia.retirada && situacionGuia(guia) === 'pendiente',
  ).length;
  if (pendientes > 0) {
    return negado(
      pendientes === 1
        ? 'Queda 1 guía pendiente.'
        : `Quedan ${pendientes} guías pendientes.`,
    );
  }
  if (despacho.porEnviar > 0) {
    return negado(
      `Tienes ${despacho.porEnviar} ${despacho.porEnviar === 1 ? 'envío' : 'envíos'} sin confirmar. Envíalos antes de terminar.`,
    );
  }
  return permitido;
};

/** Texto vacío viaja como null: Fluor distingue "no lo dijo" de un dato. */
const opcional = (texto: string | undefined) => {
  const limpio = texto?.trim() ?? '';
  return limpio === '' ? null : limpio;
};

export type Ubicacion = {latitud: number; longitud: number};

/** Sin GPS, la operación igual sale: la ubicación es un dato extra. */
const coordenadas = (ubicacion: Ubicacion | null) => ({
  latitud: ubicacion?.latitud ?? null,
  longitud: ubicacion?.longitud ?? null,
});

export type DatosEntrega = {
  recibe?: string;
  numeroIdentificacion?: string;
  parentesco?: string;
  celular?: string;
};

/** Formato del cuerpo de la entrega: 2 = multipart de `POST /tte/movil/guia/entrega`. */
export const VERSION_CUERPO_ENTREGA = 2;

/**
 * Campo `datos` de `POST /tte/movil/guia/entrega` (docs/offline.md §12.1). Se guarda
 * ya listo para Fluor; las fotos y la firma van aparte, como archivos.
 */
export const cuerpoEntrega = (
  codigoGuia: number,
  datos: DatosEntrega,
  fecha: string,
  ubicacion: Ubicacion | null = null,
) => ({
  guia: codigoGuia,
  fecha_entrega: fecha,
  recibe: opcional(datos.recibe),
  recibe_parentesco: opcional(datos.parentesco),
  recibe_numero_identificacion: opcional(datos.numeroIdentificacion),
  recibe_celular: opcional(datos.celular),
  ...coordenadas(ubicacion),
});

export type CuerpoEntrega = ReturnType<typeof cuerpoEntrega>;

/**
 * Cuerpos de novedad y terminar (docs/contratos-fluor.md §6 y §8). Provisionales
 * hasta que Fluor publique esos endpoints.
 */

export const cuerpoNovedad = (
  ids: {codigoGuia: number; codigoDespacho: number},
  datos: {tipo: string; descripcion?: string},
  fecha: string,
  ubicacion: Ubicacion | null = null,
) => ({
  codigo_guia_pk: ids.codigoGuia,
  codigo_despacho_fk: ids.codigoDespacho,
  codigo_novedad_tipo_fk: datos.tipo,
  descripcion: opcional(datos.descripcion),
  fecha,
  ...coordenadas(ubicacion),
});

export const cuerpoTerminar = (codigoDespacho: number, fecha: string) => ({
  codigo_despacho_pk: codigoDespacho,
  fecha,
});

export type TipoArchivo = 'foto' | 'firma';
