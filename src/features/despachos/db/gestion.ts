import {and, eq} from 'drizzle-orm';

import {ErrorApi} from '@/core/api';
import {despachos, guias, type Consulta, type GestionLocal} from '@/core/db';
import {encolar} from '@/core/sync';

import {claveDespacho, claveGuia} from '../domain/claves';
import {fechaLocalIso} from '../domain/formato';
import {
  cuerpoEntrega,
  cuerpoNovedad,
  cuerpoTerminar,
  puedeEntregar,
  puedeReportarNovedad,
  puedeTerminar,
  type ConfiguracionEntrega,
  type DatosEntrega,
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
};

export const registrarEntrega = async (
  tx: Consulta,
  {usuarioId, tenantDespachoId, codigoGuia, ahora = Date.now()}: Gestion,
  datos: DatosEntrega,
  configuracion: ConfiguracionEntrega,
) => {
  const {despacho, guia} = await cargar(tx, tenantDespachoId, codigoGuia);
  const permiso = puedeEntregar(despacho, guia, configuracion);
  if (!permiso.permitido) throw rechazar(permiso.motivo);

  await marcarGuia(tx, tenantDespachoId, codigoGuia, 'entregada');
  return encolar(
    tx,
    {
      usuarioId,
      tipo: 'entrega',
      claveEntidad: claveGuia(tenantDespachoId, codigoGuia),
      tenantDespachoId,
      cuerpo: cuerpoEntrega(
        {codigoGuia, codigoDespacho: despacho.codigoDespacho},
        datos,
        fechaLocalIso(ahora),
      ),
    },
    ahora,
  );
};

export const registrarNovedad = async (
  tx: Consulta,
  {usuarioId, tenantDespachoId, codigoGuia, ahora = Date.now()}: Gestion,
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
