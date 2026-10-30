import {
  and,
  asc,
  desc,
  eq,
  getTableColumns,
  inArray,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm';

import {despachos, guias, operaciones, type Consulta} from '@/core/db';
import {
  descartar,
  SIN_CONFIRMAR,
  sinConfirmarDelDespacho,
  type Operacion,
} from '@/core/sync';

import type {Asignacion, DespachoGuias, GuiaFluor} from '../api/despachos';
import {claveGuia} from '../domain/claves';

export type DespachoLocal = typeof despachos.$inferSelect & {
  totalGuias: number;
  /** Entregadas o con novedad, según Fluor o según lo que hizo el conductor. */
  gestionadas: number;
  /** Operaciones del despacho que aún no confirma Fluor. */
  porEnviar: number;
};

/**
 * Cómo va el envío de lo que hizo el conductor en la guía: `porEnviar` mientras
 * la cola lo tiene, `conProblema` si Fluor lo rechazó. Null si no hay nada pendiente.
 */
export type EnvioGuia = 'porEnviar' | 'conProblema' | null;

export type GuiaLocal = typeof guias.$inferSelect & {envio: EnvioGuia};

/** Misma forma que `claveGuia` (domain/claves.ts), armada en SQL. */
const claveGuiaSql = sql`'guia:' || ${guias.tenantDespachoId} || ':' || ${guias.codigoGuia}`;

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

const consultarDespachos = async (
  db: Consulta,
  condicion: SQL | undefined,
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
    .where(condicion)
    .orderBy(desc(despachos.asignadoEn), desc(despachos.tenantDespachoId));
  return filas.map(({despacho, totalGuias, gestionadas, porEnviar}) => ({
    ...despacho,
    totalGuias: Number(totalGuias),
    gestionadas: Number(gestionadas),
    porEnviar: Number(porEnviar),
  }));
};

/** Despachos del usuario con su avance, del más reciente al más antiguo. */
export const leerDespachos = (db: Consulta, usuarioId: number) =>
  consultarDespachos(db, eq(despachos.usuarioId, usuarioId));

/** Un despacho con su avance, o null si ya no está en el teléfono. */
export const leerDespacho = async (db: Consulta, tenantDespachoId: number) => {
  const [despacho] = await consultarDespachos(
    db,
    eq(despachos.tenantDespachoId, tenantDespachoId),
  );
  return despacho ?? null;
};

const columnasGuia = {
  ...getTableColumns(guias),
  envio: sql<EnvioGuia>`(
    SELECT CASE
      WHEN sum(${operaciones.estado} IN ('rechazada', 'conflicto')) > 0 THEN 'conProblema'
      WHEN count(*) > 0 THEN 'porEnviar'
    END
    FROM ${operaciones}
    WHERE ${operaciones.claveEntidad} = ${claveGuiaSql}
      AND ${inArray(operaciones.estado, SIN_CONFIRMAR)})`,
};

/** Guías del despacho en orden de ruta; las que no tienen orden van al final. */
export const leerGuias = (
  db: Consulta,
  tenantDespachoId: number,
): Promise<GuiaLocal[]> =>
  db
    .select(columnasGuia)
    .from(guias)
    .where(eq(guias.tenantDespachoId, tenantDespachoId))
    .orderBy(
      sql`${guias.ordenRuta} IS NULL`,
      asc(guias.ordenRuta),
      asc(guias.codigoDespachoDetalle),
    );

export const leerGuia = async (
  db: Consulta,
  tenantDespachoId: number,
  codigoGuia: number,
): Promise<GuiaLocal | null> => {
  const [guia] = await db
    .select(columnasGuia)
    .from(guias)
    .where(
      and(
        eq(guias.tenantDespachoId, tenantDespachoId),
        eq(guias.codigoGuia, codigoGuia),
      ),
    );
  return guia ?? null;
};

/** Una operación de la cola con lo que el conductor reconoce: la guía y el despacho. */
export type EnvioLocal = Operacion & {
  codigoGuia: number | null;
  nombreDestinatario: string | null;
  codigoDespacho: number | null;
};

/** Operaciones sin confirmar del usuario, de la más antigua a la más nueva. */
export const leerEnvios = async (
  db: Consulta,
  usuarioId: number,
): Promise<EnvioLocal[]> => {
  const filas = await db
    .select({
      operacion: operaciones,
      codigoGuia: guias.codigoGuia,
      nombreDestinatario: guias.nombreDestinatario,
      codigoDespacho: despachos.codigoDespacho,
    })
    .from(operaciones)
    .leftJoin(
      guias,
      and(
        eq(guias.tenantDespachoId, operaciones.tenantDespachoId),
        sql`${operaciones.claveEntidad} = ${claveGuiaSql}`,
      ),
    )
    .leftJoin(
      despachos,
      eq(despachos.tenantDespachoId, operaciones.tenantDespachoId),
    )
    .where(
      and(
        eq(operaciones.usuarioId, usuarioId),
        inArray(operaciones.estado, SIN_CONFIRMAR),
      ),
    )
    .orderBy(asc(operaciones.creadaEn), sql`operaciones_pendientes.rowid`);
  return filas.map(({operacion, ...resto}) => ({...operacion, ...resto}));
};

/**
 * Descarta una operación rechazada (y lo que depende de ella). Si la guía se
 * queda sin nada por enviar, vuelve a lo que dice Fluor; un terminar
 * descartado reabre el despacho; si el despacho estaba liberado y ya no tiene
 * pendientes, se borra. Devuelve los ids descartados.
 */
export const descartarEnvio = async (tx: Consulta, idOperacion: string) => {
  const [operacion] = await tx
    .select()
    .from(operaciones)
    .where(eq(operaciones.idOperacion, idOperacion));
  const ids = await descartar(tx, idOperacion);
  if (!operacion || ids.length === 0) return ids;

  const [quedan] = await tx
    .select({total: sql<number>`count(*)`})
    .from(operaciones)
    .where(
      and(
        eq(operaciones.claveEntidad, operacion.claveEntidad),
        inArray(operaciones.estado, SIN_CONFIRMAR),
      ),
    );
  if (Number(quedan?.total ?? 0) === 0) {
    const deLaGuia = sql`${claveGuiaSql} = ${operacion.claveEntidad}`;
    await tx.delete(guias).where(and(deLaGuia, eq(guias.retirada, true)));
    await tx.update(guias).set({gestionLocal: null}).where(deLaGuia);
  }

  const td = operacion.tenantDespachoId;
  if (operacion.tipo === 'terminar' && td !== null) {
    // Sin el terminar, el despacho vuelve a estar abierto en el teléfono.
    await tx
      .update(despachos)
      .set({terminadoEn: null})
      .where(eq(despachos.tenantDespachoId, td));
  }
  if (td !== null && (await sinConfirmarDelDespacho(tx, td)) === 0) {
    await tx
      .delete(despachos)
      .where(
        and(eq(despachos.tenantDespachoId, td), eq(despachos.liberado, true)),
      );
  }
  return ids;
};
