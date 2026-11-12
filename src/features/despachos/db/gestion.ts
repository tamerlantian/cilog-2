import {and, eq} from 'drizzle-orm';

import {ErrorApi} from '@/core/api';
import {
  archivos,
  despachos,
  guias,
  type Consulta,
  type GestionLocal,
} from '@/core/db';
import {encolar} from '@/core/sync';

import {claveDespacho, claveGuia} from '../domain/claves';
import {fechaLocalIso} from '../domain/formato';
import {
  cuerpoEntrega,
  cuerpoNovedad,
  cuerpoTerminar,
  puedeEntregar,
  puedeReportarNovedad,
  evidenciaFaltante,
  puedeTerminar,
  VERSION_CUERPO_ENTREGA,
  type ConfiguracionEntrega,
  type DatosEntrega,
  type TipoArchivo,
  type Ubicacion,
} from '../domain/gestion';
import {leerDespacho, leerGuia, leerGuias} from './repositorio';

/**
 * Lo que hace el conductor en la guía o el despacho. Cada función revisa las
 * reglas con lo que hay en la base, marca el cambio local y encola la
 * operación en la misma transacción (docs/offline.md §6.2): quedan ambos o
 * ninguno. Devuelven el `id_operacion`.
 */

const rechazar = (motivo: string) =>
  new ErrorApi({codigo: 'CONFLICTO', mensaje: motivo});

const cargar = async (
  tx: Consulta,
  tenantDespachoId: number,
  codigoGuia: number,
) => {
  const despacho = await leerDespacho(tx, tenantDespachoId);
  const guia = await leerGuia(tx, tenantDespachoId, codigoGuia);
  if (!despacho || !guia) {
    throw rechazar('La guía ya no está en el teléfono.');
  }
  return {despacho, guia};
};

const marcarGuia = (
  tx: Consulta,
  tenantDespachoId: number,
  codigoGuia: number,
  gestion: GestionLocal,
) =>
  tx
    .update(guias)
    .set({gestionLocal: gestion})
    .where(
      and(
        eq(guias.tenantDespachoId, tenantDespachoId),
        eq(guias.codigoGuia, codigoGuia),
      ),
    );

type Gestion = {
  usuarioId: number;
  tenantDespachoId: number;
  codigoGuia: number;
  ahora?: number;
  ubicacion?: Ubicacion | null;
};

/** Foto o firma ya guardada en la carpeta de evidencias. */
export type Evidencia = {tipo: TipoArchivo; ruta: string; bytes: number};

/**
 * La entrega y sus fotos y firma son una sola operación: viajan juntas en
 * `POST /tte/movil/guia/entrega` (docs/offline.md §8).
 */
export const registrarEntrega = async (
  tx: Consulta,
  {
    usuarioId,
    tenantDespachoId,
    codigoGuia,
    ahora = Date.now(),
    ubicacion = null,
  }: Gestion,
  datos: DatosEntrega,
  configuracion: ConfiguracionEntrega,
  evidencias: readonly Evidencia[] = [],
) => {
  const {despacho, guia} = await cargar(tx, tenantDespachoId, codigoGuia);
  const permiso = puedeEntregar(despacho, guia, configuracion);
  if (!permiso.permitido) throw rechazar(permiso.motivo);
  const faltante = evidenciaFaltante(configuracion, {
    fotos: evidencias.filter(e => e.tipo === 'foto').length,
    firma: evidencias.some(e => e.tipo === 'firma'),
  });
  if (faltante) throw rechazar(faltante);

  await marcarGuia(tx, tenantDespachoId, codigoGuia, 'entregada');
  const idEntrega = await encolar(
    tx,
    {
      usuarioId,
      tipo: 'entrega',
      claveEntidad: claveGuia(tenantDespachoId, codigoGuia),
      tenantDespachoId,
      cuerpo: cuerpoEntrega(codigoGuia, datos, fechaLocalIso(ahora), ubicacion),
      versionCuerpo: VERSION_CUERPO_ENTREGA,
    },
    ahora,
  );

  for (const evidencia of evidencias) {
    await tx.insert(archivos).values({
      ruta: evidencia.ruta,
      idOperacion: idEntrega,
      tipo: evidencia.tipo === 'firma' ? 'F' : 'I',
      bytes: evidencia.bytes,
    });
  }
  return idEntrega;
};

export const registrarNovedad = async (
  tx: Consulta,
  {
    usuarioId,
    tenantDespachoId,
    codigoGuia,
    ahora = Date.now(),
    ubicacion = null,
  }: Gestion,
  datos: {tipo: string; descripcion?: string},
) => {
  const {despacho, guia} = await cargar(tx, tenantDespachoId, codigoGuia);
  const permiso = puedeReportarNovedad(despacho, guia);
  if (!permiso.permitido) throw rechazar(permiso.motivo);

  await marcarGuia(tx, tenantDespachoId, codigoGuia, 'novedad');
  return encolar(
    tx,
    {
      usuarioId,
      tipo: 'novedad',
      claveEntidad: claveGuia(tenantDespachoId, codigoGuia),
      tenantDespachoId,
      cuerpo: cuerpoNovedad(
        {codigoGuia, codigoDespacho: despacho.codigoDespacho},
        datos,
        fechaLocalIso(ahora),
        ubicacion,
      ),
    },
    ahora,
  );
};

export const registrarTerminar = async (
  tx: Consulta,
  {
    usuarioId,
    tenantDespachoId,
    ahora = Date.now(),
  }: Omit<Gestion, 'codigoGuia'>,
) => {
  const despacho = await leerDespacho(tx, tenantDespachoId);
  if (!despacho) throw rechazar('El despacho ya no está en el teléfono.');
  const permiso = puedeTerminar(
    despacho,
    await leerGuias(tx, tenantDespachoId),
  );
  if (!permiso.permitido) throw rechazar(permiso.motivo);

  await tx
    .update(despachos)
    .set({terminadoEn: ahora})
    .where(eq(despachos.tenantDespachoId, tenantDespachoId));
  return encolar(
    tx,
    {
      usuarioId,
      tipo: 'terminar',
      claveEntidad: claveDespacho(tenantDespachoId),
      tenantDespachoId,
      cuerpo: cuerpoTerminar(despacho.codigoDespacho, fechaLocalIso(ahora)),
    },
    ahora,
  );
};

/**
 * Varias guías gestionadas juntas (mismo cliente, misma puerta): una operación
 * por guía, todas con la misma hora y ubicación y en la misma transacción.
 * Si una no se puede, no se guarda ninguna. Fluor recibe una petición por
 * guía, así que el motor, los reintentos y el 409 funcionan igual que con una.
 */
const porGuia = async <R>(
  codigosGuia: readonly number[],
  registrar: (codigoGuia: number, indice: number) => Promise<R>,
) => {
  if (codigosGuia.length === 0) throw rechazar('No hay guías seleccionadas.');
  if (new Set(codigosGuia).size !== codigosGuia.length) {
    throw rechazar('Una guía está repetida en la selección.');
  }
  const ids: R[] = [];
  for (const [indice, codigoGuia] of codigosGuia.entries()) {
    try {
      ids.push(await registrar(codigoGuia, indice));
    } catch (error) {
      if (codigosGuia.length > 1 && error instanceof ErrorApi) {
        throw rechazar(`Guía ${codigoGuia}: ${error.message}`);
      }
      throw error;
    }
  }
  return ids;
};

type GestionVarias = Omit<Gestion, 'codigoGuia'> & {
  codigosGuia: readonly number[];
};

/**
 * `evidencias[i]` son los archivos de la guía `codigosGuia[i]`: cada entrega
 * tiene sus propias copias, porque al confirmarse borra las suyas (§8).
 */
export const registrarEntregas = (
  tx: Consulta,
  {codigosGuia, ahora = Date.now(), ...gestion}: GestionVarias,
  datos: DatosEntrega,
  configuracion: ConfiguracionEntrega,
  evidencias: readonly (readonly Evidencia[])[] = [],
) =>
  porGuia(codigosGuia, (codigoGuia, indice) =>
    registrarEntrega(
      tx,
      {...gestion, codigoGuia, ahora},
      datos,
      configuracion,
      evidencias[indice] ?? [],
    ),
  );

/** Preparado para la novedad de varias guías; se activa con `funciones.novedades`. */
export const registrarNovedades = (
  tx: Consulta,
  {codigosGuia, ahora = Date.now(), ...gestion}: GestionVarias,
  datos: {tipo: string; descripcion?: string},
) =>
  porGuia(codigosGuia, codigoGuia =>
    registrarNovedad(tx, {...gestion, codigoGuia, ahora}, datos),
  );
