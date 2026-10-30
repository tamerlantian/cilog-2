import {and, asc, desc, eq, inArray, notInArray, sql} from 'drizzle-orm';

import {despachos, guias, operaciones, type Consulta} from '@/core/db';
import {SIN_CONFIRMAR, sinConfirmarDelDespacho} from '@/core/sync';

import type {Asignacion, DespachoGuias, GuiaFluor} from '../api/despachos';
import {claveGuia} from '../domain/claves';

export type DespachoLocal = typeof despachos.$inferSelect & {
  totalGuias: number;
  /** Entregadas o con novedad, según Fluor o según lo que hizo el conductor. */
  gestionadas: number;
  /** Operaciones del despacho que aún no confirma Fluor. */
  porEnviar: number;
};

export type GuiaLocal = typeof guias.$inferSelect;

/** Claves de las guías del despacho que tienen operaciones sin confirmar. */
const clavesConPendientes = async (db: Consulta, tenantDespachoId: number) => {
  const filas = await db
    .selectDistinct({clave: operaciones.claveEntidad})
    .from(operaciones)
    .where(
      and(
        eq(operaciones.tenantDespachoId, tenantDespachoId),
        inArray(operaciones.estado, SIN_CONFIRMAR),
      ),
    );
  return new Set(filas.map(f => f.clave));
};

/**
 * El despacho ya no es del usuario en Fluor (lo liberaron o no aparece en la
 * lista). Si el conductor hizo algo que no ha llegado, se conserva marcado
 * como liberado; si no, se borra con sus guías.
 */
export const quitarDespacho = async (
  tx: Consulta,
  tenantDespachoId: number,
) => {
  if ((await sinConfirmarDelDespacho(tx, tenantDespachoId)) > 0) {
    await tx
      .update(despachos)
      .set({liberado: true})
      .where(eq(despachos.tenantDespachoId, tenantDespachoId));
    return 'liberado' as const;
  }
  await tx
    .delete(despachos)
    .where(eq(despachos.tenantDespachoId, tenantDespachoId));
  return 'borrado' as const;
};

/** Guarda o actualiza un despacho asignado (p. ej. recién vinculado). */
export const guardarAsignacion = async (
  tx: Consulta,
  usuarioId: number,
  asignacion: Asignacion,
) => {
  const datos = {
    usuarioId,
    tenantId: asignacion.tenant_id,
    tenantNombre: asignacion.tenant_nombre,
    codigoDespacho: asignacion.codigo_despacho,
    asignadoEn: asignacion.fecha,
    liberado: false,
  };
  await tx
    .insert(despachos)
    .values({tenantDespachoId: asignacion.id, ...datos})
    .onConflictDoUpdate({target: despachos.tenantDespachoId, set: datos});
};

/** Guarda la lista completa de despachos asignados; los que ya no vienen se quitan. */
export const guardarAsignaciones = async (
  tx: Consulta,
  usuarioId: number,
  asignaciones: Asignacion[],
) => {
  for (const asignacion of asignaciones) {
    await guardarAsignacion(tx, usuarioId, asignacion);
  }

  const vigentes = asignaciones.map(a => a.id);
  const sobrantes = await tx
    .select({id: despachos.tenantDespachoId})
    .from(despachos)
    .where(
      and(
        eq(despachos.usuarioId, usuarioId),
        vigentes.length > 0
          ? notInArray(despachos.tenantDespachoId, vigentes)
          : undefined,
      ),
    );
  for (const {id} of sobrantes) await quitarDespacho(tx, id);
};

const datosDeFluor = (guia: GuiaFluor) => ({
  codigoDespachoDetalle: guia.codigo_despacho_detalle,
  documentoCliente: guia.documento_cliente,
  nombreRemitente: guia.nombre_remitente,
  nombreDestinatario: guia.nombre_destinatario,
  direccionDestinatario: guia.direccion_destinatario,
  telefonoDestinatario: guia.telefono_destinatario,
  ciudadDestino: guia.ciudad_destino,
  unidades: guia.unidades,
  pesoReal: guia.peso_real,
  vrRecaudo: guia.vr_recaudo,
  vrCobroEntrega: guia.vr_cobro_entrega,
  ordenRuta: guia.orden_ruta,
  latitud: guia.latitud,
  longitud: guia.longitud,
  requiereCita: guia.requiere_cita,
  comentario: guia.comentario,
  estadoEntregado: guia.estado_entregado,
  estadoNovedad: guia.estado_novedad,
  fechaEntrega: guia.fecha_entrega,
  retirada: false,
});

/**
 * Fusiona la descarga de guías con lo local (docs/offline.md §5): los datos de
 * Fluor se actualizan siempre, pero lo que hizo el conductor y no ha llegado a
 * Fluor (`gestion_local`) no se pisa, y una guía que Fluor quitó no se borra
 * si tiene operaciones sin confirmar.
 */
export const fusionarGuias = async (
  tx: Consulta,
  usuarioId: number,
  descarga: DespachoGuias,
  ahora = Date.now(),
) => {
  const id = descarga.tenant_despacho_id;
  const datosDespacho = {
    usuarioId,
    tenantId: descarga.tenant_id,
    tenantNombre: descarga.tenant_nombre,
    codigoDespacho: descarga.codigo_despacho,
    numero: descarga.numero,
    fechaSalida: descarga.fecha_salida,
    descargadoEn: ahora,
  };
  await tx
    .insert(despachos)
    .values({
      tenantDespachoId: id,
      asignadoEn: new Date(ahora).toISOString(),
      ...datosDespacho,
    })
    .onConflictDoUpdate({
      target: despachos.tenantDespachoId,
      set: datosDespacho,
    });

  const conPendientes = await clavesConPendientes(tx, id);

  for (const guia of descarga.guias) {
    const datos = datosDeFluor(guia);
    const pendiente = conPendientes.has(claveGuia(id, guia.codigo_guia));
    await tx
      .insert(guias)
      .values({tenantDespachoId: id, codigoGuia: guia.codigo_guia, ...datos})
      .onConflictDoUpdate({
        target: [guias.tenantDespachoId, guias.codigoGuia],
        // Sin operaciones pendientes, Fluor ya refleja lo que hizo el conductor.
        set: pendiente ? datos : {...datos, gestionLocal: null},
      });
  }

  const recibidas = descarga.guias.map(g => g.codigo_guia);
  const ausentes = await tx
    .select({codigo: guias.codigoGuia})
    .from(guias)
    .where(
      and(
        eq(guias.tenantDespachoId, id),
        recibidas.length > 0
          ? notInArray(guias.codigoGuia, recibidas)
          : undefined,
      ),
    );
  for (const {codigo} of ausentes) {
    const deEsta = and(
      eq(guias.tenantDespachoId, id),
      eq(guias.codigoGuia, codigo),
    );
    if (conPendientes.has(claveGuia(id, codigo))) {
      await tx.update(guias).set({retirada: true}).where(deEsta);
    } else {
      await tx.delete(guias).where(deEsta);
    }
  }
};

/** Despachos del usuario con su avance, del más reciente al más antiguo. */
export const leerDespachos = async (
  db: Consulta,
  usuarioId: number,
): Promise<DespachoLocal[]> => {
  const gestionada = sql`(${guias.gestionLocal} IS NOT NULL OR ${guias.estadoEntregado} = 1 OR ${guias.estadoNovedad} = 1)`;
  const filas = await db
    .select({
      despacho: despachos,
      totalGuias: sql<number>`(
        SELECT count(*) FROM ${guias}
        WHERE ${guias.tenantDespachoId} = ${despachos.tenantDespachoId}
          AND ${guias.retirada} = 0)`,
      gestionadas: sql<number>`(
        SELECT count(*) FROM ${guias}
        WHERE ${guias.tenantDespachoId} = ${despachos.tenantDespachoId}
          AND ${guias.retirada} = 0 AND ${gestionada})`,
      porEnviar: sql<number>`(
        SELECT count(*) FROM ${operaciones}
        WHERE ${operaciones.tenantDespachoId} = ${despachos.tenantDespachoId}
          AND ${inArray(operaciones.estado, SIN_CONFIRMAR)})`,
    })
    .from(despachos)
    .where(eq(despachos.usuarioId, usuarioId))
    .orderBy(desc(despachos.asignadoEn), desc(despachos.tenantDespachoId));
  return filas.map(({despacho, totalGuias, gestionadas, porEnviar}) => ({
    ...despacho,
    totalGuias: Number(totalGuias),
    gestionadas: Number(gestionadas),
    porEnviar: Number(porEnviar),
  }));
};

/** Guías del despacho en orden de ruta; las que no tienen orden van al final. */
export const leerGuias = (db: Consulta, tenantDespachoId: number) =>
  db
    .select()
    .from(guias)
    .where(eq(guias.tenantDespachoId, tenantDespachoId))
    .orderBy(
      sql`${guias.ordenRuta} IS NULL`,
      asc(guias.ordenRuta),
      asc(guias.codigoDespachoDetalle),
    );
