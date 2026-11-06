import {and, asc, eq, inArray, lte, sql} from 'drizzle-orm';
import {v4 as uuidV4} from 'uuid';

import {
  archivos,
  operaciones,
  type Consulta,
  type EstadoOperacion,
} from '@/core/db';

export type Operacion = typeof operaciones.$inferSelect;

export type NuevaOperacion = {
  usuarioId: number;
  tipo: string;
  /** Entidad afectada; sus operaciones se envían en el orden en que se crearon. */
  claveEntidad: string;
  tenantDespachoId?: number | null;
  /** Operación que debe confirmarse antes (p. ej. las entregas antes de terminar). */
  dependeDe?: string | null;
  cuerpo: unknown;
  /** Formato del cuerpo; cambia cuando cambia el contrato con Fluor (docs/offline.md §11). */
  versionCuerpo?: number;
};

/** Foto o firma que viaja con su operación. */
export type ArchivoOperacion = {ruta: string; tipo: 'F' | 'I'; bytes: number};

/** Estados que todavía no llegaron a Fluor (o que Fluor rechazó y guardan evidencia). */
export const SIN_CONFIRMAR: EstadoOperacion[] = [
  'pendiente',
  'enviando',
  'pausada',
  'rechazada',
  'conflicto',
];

/**
 * Agrega una operación a la cola. Se llama dentro de la misma transacción que
 * guarda el cambio local, para que ambos queden o ninguno. Devuelve su
 * `id_operacion`, la llave de la operación en la cola.
 */
export const encolar = async (
  tx: Consulta,
  nueva: NuevaOperacion,
  ahora = Date.now(),
) => {
  const idOperacion = uuidV4();
  await tx.insert(operaciones).values({
    idOperacion,
    usuarioId: nueva.usuarioId,
    tipo: nueva.tipo,
    claveEntidad: nueva.claveEntidad,
    tenantDespachoId: nueva.tenantDespachoId ?? null,
    dependeDe: nueva.dependeDe ?? null,
    cuerpo: JSON.stringify(nueva.cuerpo),
    versionCuerpo: nueva.versionCuerpo ?? 1,
    estado: 'pendiente',
    proximoIntento: ahora,
    creadaEn: ahora,
  });
  return idOperacion;
};

/**
 * La próxima operación que se puede enviar: pendiente, de un tipo que la app sabe
 * enviar, sin una anterior de la misma entidad sin confirmar y con su dependencia
 * ya confirmada.
 */
export const siguienteLista = async (
  db: Consulta,
  {
    usuarioId,
    tipos,
    hasta,
  }: {usuarioId: number; tipos: string[]; hasta: number | null},
): Promise<Operacion | undefined> => {
  if (tipos.length === 0) return undefined;
  const [operacion] = await db
    .select()
    .from(operaciones)
    .where(
      and(
        eq(operaciones.usuarioId, usuarioId),
        eq(operaciones.estado, 'pendiente'),
        inArray(operaciones.tipo, tipos),
        hasta === null ? undefined : lte(operaciones.proximoIntento, hasta),
        sql`NOT EXISTS (
          SELECT 1 FROM operaciones_pendientes previa
          WHERE previa.clave_entidad = ${operaciones.claveEntidad}
            AND (previa.creada_en < ${operaciones.creadaEn}
              OR (previa.creada_en = ${operaciones.creadaEn}
                AND previa.rowid < operaciones_pendientes.rowid))
            AND previa.estado <> 'confirmada'
        )`,
        sql`(${operaciones.dependeDe} IS NULL OR NOT EXISTS (
          SELECT 1 FROM operaciones_pendientes dep
          WHERE dep.id_operacion = ${operaciones.dependeDe}
            AND dep.estado <> 'confirmada'
        ))`,
      ),
    )
    // rowid desempata operaciones creadas en el mismo milisegundo: es el orden de inserción.
    .orderBy(asc(operaciones.creadaEn), sql`operaciones_pendientes.rowid`)
    .limit(1);
  return operacion;
};

export const marcarEnviando = (tx: Consulta, idOperacion: string) =>
  tx
    .update(operaciones)
    .set({estado: 'enviando'})
    .where(eq(operaciones.idOperacion, idOperacion));

export const marcarConfirmada = (
  tx: Consulta,
  idOperacion: string,
  ahora = Date.now(),
) =>
  tx
    .update(operaciones)
    .set({
      estado: 'confirmada',
      confirmadaEn: ahora,
      ultimoError: null,
      codigoError: null,
    })
    .where(eq(operaciones.idOperacion, idOperacion));

type Fallo = {mensaje: string; codigo: string; requestId: string | null};

/** Error transitorio: vuelve a la cola y espera hasta `proximoIntento`. */
export const programarReintento = (
  tx: Consulta,
  idOperacion: string,
  fallo: Fallo & {proximoIntento: number},
) =>
  tx
    .update(operaciones)
    .set({
      estado: 'pendiente',
      intentos: sql`${operaciones.intentos} + 1`,
      proximoIntento: fallo.proximoIntento,
      ultimoError: fallo.mensaje,
      codigoError: fallo.codigo,
      requestId: fallo.requestId,
    })
    .where(eq(operaciones.idOperacion, idOperacion));

/** Fluor no la acepta: necesita que el conductor decida (reintentar o descartar). */
export const marcarFallida = (
  tx: Consulta,
  idOperacion: string,
  estado: 'rechazada' | 'conflicto',
  fallo: Fallo,
) =>
  tx
    .update(operaciones)
    .set({
      estado,
      intentos: sql`${operaciones.intentos} + 1`,
      ultimoError: fallo.mensaje,
      codigoError: fallo.codigo,
      requestId: fallo.requestId,
    })
    .where(eq(operaciones.idOperacion, idOperacion));

/** La sesión no sirve: nada del usuario sale hasta que vuelva a iniciar sesión. */
export const pausarUsuario = (tx: Consulta, usuarioId: number) =>
  tx
    .update(operaciones)
    .set({estado: 'pausada'})
    .where(
      and(
        eq(operaciones.usuarioId, usuarioId),
        inArray(operaciones.estado, ['pendiente', 'enviando']),
      ),
    );

export const reanudarUsuario = (
  tx: Consulta,
  usuarioId: number,
  ahora = Date.now(),
) =>
  tx
    .update(operaciones)
    .set({estado: 'pendiente', proximoIntento: ahora})
    .where(
      and(
        eq(operaciones.usuarioId, usuarioId),
        eq(operaciones.estado, 'pausada'),
      ),
    );

/**
 * Al abrir la app: lo que quedó `enviando` es de una ejecución que murió sin
 * respuesta. Se reenvía; si Fluor ya la tenía, el enviador lo reconoce
 * (p. ej. el 409 con `entrega: true`) y no se duplica.
 */
export const recuperarInterrumpidas = (tx: Consulta) =>
  tx
    .update(operaciones)
    .set({estado: 'pendiente'})
    .where(eq(operaciones.estado, 'enviando'));

/** El conductor pide reintentar una rechazada (p. ej. tras hablar con la oficina). */
export const reintentar = (
  tx: Consulta,
  idOperacion: string,
  ahora = Date.now(),
) =>
  tx
    .update(operaciones)
    .set({estado: 'pendiente', proximoIntento: ahora})
    .where(
      and(
        eq(operaciones.idOperacion, idOperacion),
        inArray(operaciones.estado, ['rechazada', 'conflicto']),
      ),
    );

/**
 * Borra una rechazada o en conflicto y todo lo que depende de ella.
 * Devuelve los ids borrados y las rutas de sus archivos: quien llama los borra
 * del disco después de confirmar la transacción.
 */
export const descartar = async (tx: Consulta, idOperacion: string) => {
  const filas = await tx.values<[string]>(sql`
    WITH RECURSIVE arbol(id) AS (
      SELECT id_operacion FROM operaciones_pendientes
      WHERE id_operacion = ${idOperacion} AND estado IN ('rechazada', 'conflicto')
      UNION
      SELECT o.id_operacion FROM operaciones_pendientes o JOIN arbol ON o.depende_de = arbol.id
    )
    SELECT id FROM arbol`);
  const ids = filas.map(([id]) => id);
  if (ids.length === 0) return {ids, rutas: []};
  const rutas = await tx
    .select({ruta: archivos.ruta})
    .from(archivos)
    .where(inArray(archivos.idOperacion, ids));
  await tx.delete(operaciones).where(inArray(operaciones.idOperacion, ids));
  return {ids, rutas: rutas.map(f => f.ruta)};
};

/** Fotos y firma que viajan con la operación. */
export const archivosDe = (db: Consulta, idOperacion: string) =>
  db
    .select({ruta: archivos.ruta, tipo: archivos.tipo, bytes: archivos.bytes})
    .from(archivos)
    .where(eq(archivos.idOperacion, idOperacion))
    .orderBy(sql`archivos.rowid`);

/**
 * La operación ya llegó a Fluor con sus archivos: dejan de ser necesarios.
 * Quita los registros y devuelve las rutas para borrarlas del disco.
 */
export const soltarArchivos = async (tx: Consulta, idOperacion: string) => {
  const rutas = await tx
    .select({ruta: archivos.ruta})
    .from(archivos)
    .where(eq(archivos.idOperacion, idOperacion));
  await tx.delete(archivos).where(eq(archivos.idOperacion, idOperacion));
  return rutas.map(f => f.ruta);
};

/** Cuántas operaciones sin confirmar hay, por estado. */
export const resumenCola = async (db: Consulta, usuarioId: number) => {
  const filas = await db
    .select({estado: operaciones.estado, total: sql<number>`count(*)`})
    .from(operaciones)
    .where(
      and(
        eq(operaciones.usuarioId, usuarioId),
        inArray(operaciones.estado, SIN_CONFIRMAR),
      ),
    )
    .groupBy(operaciones.estado);
  const resumen: Partial<Record<EstadoOperacion, number>> = {};
  for (const {estado, total} of filas) resumen[estado] = Number(total);
  return resumen;
};

/** Operaciones sin confirmar de un despacho: bloquean terminarlo o desvincularlo. */
export const sinConfirmarDelDespacho = async (
  db: Consulta,
  tenantDespachoId: number,
) => {
  const [fila] = await db
    .select({total: sql<number>`count(*)`})
    .from(operaciones)
    .where(
      and(
        eq(operaciones.tenantDespachoId, tenantDespachoId),
        inArray(operaciones.estado, SIN_CONFIRMAR),
      ),
    );
  return Number(fila?.total ?? 0);
};

/**
 * Las confirmadas se guardan un tiempo para soporte y luego se borran, con
 * los archivos que conservaban. Devuelve sus rutas para borrarlas del disco.
 */
export const purgarConfirmadas = async (tx: Consulta, antesDe: number) => {
  const vencidas = and(
    eq(operaciones.estado, 'confirmada'),
    lte(operaciones.confirmadaEn, antesDe),
  );
  const rutas = await tx
    .select({ruta: archivos.ruta})
    .from(archivos)
    .innerJoin(operaciones, eq(operaciones.idOperacion, archivos.idOperacion))
    .where(vencidas);
  await tx.delete(operaciones).where(vencidas);
  return rutas.map(f => f.ruta);
};
