import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

/**
 * Tablas locales. Deben coincidir con `migraciones.ts`: drizzle solo arma las
 * consultas, el esquema real lo crean las migraciones.
 * Fechas de Fluor: texto ISO tal cual llega. Fechas del teléfono: milisegundos.
 */

/** Despachos asignados al repartidor (`mas_tenant_despacho` en Fluor). */
export const despachos = sqliteTable(
  'despachos',
  {
    tenantDespachoId: integer('tenant_despacho_id').primaryKey(),
    usuarioId: integer('usuario_id').notNull(),
    tenantId: integer('tenant_id').notNull(),
    tenantNombre: text('tenant_nombre'),
    codigoDespacho: integer('codigo_despacho').notNull(),
    numero: integer('numero'),
    fechaSalida: text('fecha_salida'),
    asignadoEn: text('asignado_en').notNull(),
    descargadoEn: integer('descargado_en'),
    /** Fluor ya no lo asigna a este usuario, pero quedan operaciones sin confirmar. */
    liberado: integer('liberado', {mode: 'boolean'}).notNull().default(false),
  },
  t => [index('despachos_usuario').on(t.usuarioId)],
);

export type GestionLocal = 'entregada' | 'novedad';

export const guias = sqliteTable(
  'guias',
  {
    tenantDespachoId: integer('tenant_despacho_id')
      .notNull()
      .references(() => despachos.tenantDespachoId, {onDelete: 'cascade'}),
    codigoGuia: integer('codigo_guia').notNull(),
    codigoDespachoDetalle: integer('codigo_despacho_detalle').notNull(),
    documentoCliente: text('documento_cliente'),
    nombreRemitente: text('nombre_remitente'),
    nombreDestinatario: text('nombre_destinatario'),
    direccionDestinatario: text('direccion_destinatario'),
    telefonoDestinatario: text('telefono_destinatario'),
    ciudadDestino: text('ciudad_destino'),
    unidades: real('unidades').notNull(),
    pesoReal: real('peso_real').notNull(),
    vrRecaudo: real('vr_recaudo').notNull(),
    vrCobroEntrega: real('vr_cobro_entrega').notNull(),
    ordenRuta: integer('orden_ruta'),
    latitud: real('latitud'),
    longitud: real('longitud'),
    requiereCita: integer('requiere_cita', {mode: 'boolean'}).notNull(),
    comentario: text('comentario'),
    /** Lo que dijo Fluor en la última descarga. */
    estadoEntregado: integer('estado_entregado', {mode: 'boolean'}).notNull(),
    estadoNovedad: integer('estado_novedad', {mode: 'boolean'}).notNull(),
    fechaEntrega: text('fecha_entrega'),
    /** Lo que hizo el conductor y aún no confirma Fluor. Una descarga no lo pisa. */
    gestionLocal: text('gestion_local').$type<GestionLocal>(),
    /** Fluor la sacó del despacho, pero tiene operaciones sin confirmar. */
    retirada: integer('retirada', {mode: 'boolean'}).notNull().default(false),
  },
  t => [primaryKey({columns: [t.tenantDespachoId, t.codigoGuia]})],
);

export type EstadoOperacion =
  | 'pendiente'
  | 'enviando'
  | 'confirmada'
  | 'pausada'
  | 'rechazada'
  | 'conflicto';

/** Cola de escrituras del conductor. Ver docs/offline.md §6. */
export const operaciones = sqliteTable(
  'operaciones_pendientes',
  {
    idOperacion: text('id_operacion').primaryKey(),
    usuarioId: integer('usuario_id').notNull(),
    tipo: text('tipo').notNull(),
    /** Entidad afectada (`guia:12:777001`); sus operaciones salen en orden. */
    claveEntidad: text('clave_entidad').notNull(),
    tenantDespachoId: integer('tenant_despacho_id'),
    dependeDe: text('depende_de'),
    /** JSON listo para Fluor. */
    cuerpo: text('cuerpo').notNull(),
    versionCuerpo: integer('version_cuerpo').notNull().default(1),
    estado: text('estado').$type<EstadoOperacion>().notNull(),
    intentos: integer('intentos').notNull().default(0),
    proximoIntento: integer('proximo_intento').notNull(),
    ultimoError: text('ultimo_error'),
    codigoError: text('codigo_error'),
    requestId: text('request_id'),
    creadaEn: integer('creada_en').notNull(),
    confirmadaEn: integer('confirmada_en'),
  },
  t => [
    index('operaciones_cola').on(t.usuarioId, t.estado, t.creadaEn),
    index('operaciones_entidad').on(t.claveEntidad),
    index('operaciones_despacho').on(t.tenantDespachoId),
  ],
);

/** Fotos y firma de una operación; el fichero vive en documentos de la app. */
export const archivos = sqliteTable('archivos', {
  idOperacion: text('id_operacion')
    .primaryKey()
    .references(() => operaciones.idOperacion, {onDelete: 'cascade'}),
  ruta: text('ruta').notNull(),
  tipo: text('tipo').$type<'F' | 'I'>().notNull(),
  bytes: integer('bytes').notNull(),
});

export const esquema = {despachos, guias, operaciones, archivos};
export type Esquema = typeof esquema;
