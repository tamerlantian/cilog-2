/**
 * Cada versión es una lista de sentencias que se ejecutan en una transacción y
 * suben `PRAGMA user_version`. Nunca se edita una versión publicada: se agrega
 * otra. Ninguna migración puede borrar `operaciones_pendientes` ni `archivos`
 * (son entregas que aún no llegan a Fluor).
 */
export const MIGRACIONES: readonly (readonly string[])[] = [
  // 1: despachos, guías y cola de operaciones
  [
    `CREATE TABLE despachos (
      tenant_despacho_id INTEGER PRIMARY KEY NOT NULL,
      usuario_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      tenant_nombre TEXT,
      codigo_despacho INTEGER NOT NULL,
      numero INTEGER,
      fecha_salida TEXT,
      asignado_en TEXT NOT NULL,
      descargado_en INTEGER,
      liberado INTEGER NOT NULL DEFAULT 0
    )`,
    'CREATE INDEX despachos_usuario ON despachos (usuario_id)',
    `CREATE TABLE guias (
      tenant_despacho_id INTEGER NOT NULL REFERENCES despachos (tenant_despacho_id) ON DELETE CASCADE,
      codigo_guia INTEGER NOT NULL,
      codigo_despacho_detalle INTEGER NOT NULL,
      documento_cliente TEXT,
      nombre_remitente TEXT,
      nombre_destinatario TEXT,
      direccion_destinatario TEXT,
      telefono_destinatario TEXT,
      ciudad_destino TEXT,
      unidades REAL NOT NULL,
      peso_real REAL NOT NULL,
      vr_recaudo REAL NOT NULL,
      vr_cobro_entrega REAL NOT NULL,
      orden_ruta INTEGER,
      latitud REAL,
      longitud REAL,
      requiere_cita INTEGER NOT NULL,
      comentario TEXT,
      estado_entregado INTEGER NOT NULL,
      estado_novedad INTEGER NOT NULL,
      fecha_entrega TEXT,
      gestion_local TEXT,
      retirada INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (tenant_despacho_id, codigo_guia)
    )`,
    `CREATE TABLE operaciones_pendientes (
      id_operacion TEXT PRIMARY KEY NOT NULL,
      usuario_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      clave_entidad TEXT NOT NULL,
      tenant_despacho_id INTEGER,
      depende_de TEXT,
      cuerpo TEXT NOT NULL,
      version_cuerpo INTEGER NOT NULL DEFAULT 1,
      estado TEXT NOT NULL,
      intentos INTEGER NOT NULL DEFAULT 0,
      proximo_intento INTEGER NOT NULL,
      ultimo_error TEXT,
      codigo_error TEXT,
      request_id TEXT,
      creada_en INTEGER NOT NULL,
      confirmada_en INTEGER
    )`,
    'CREATE INDEX operaciones_cola ON operaciones_pendientes (usuario_id, estado, creada_en)',
    'CREATE INDEX operaciones_entidad ON operaciones_pendientes (clave_entidad)',
    'CREATE INDEX operaciones_despacho ON operaciones_pendientes (tenant_despacho_id)',
    `CREATE TABLE archivos (
      id_operacion TEXT PRIMARY KEY NOT NULL REFERENCES operaciones_pendientes (id_operacion) ON DELETE CASCADE,
      ruta TEXT NOT NULL,
      tipo TEXT NOT NULL,
      bytes INTEGER NOT NULL
    )`,
  ],
  // 2: el conductor terminó el despacho (la operación puede seguir en la cola)
  ['ALTER TABLE despachos ADD COLUMN terminado_en INTEGER'],
  // 3: las fotos y la firma viajan con la entrega (POST /tte/guia/entrega).
  // Los archivos pasan de su propia operación a la entrega de la que dependían;
  // se conservan todas las filas, solo cambia a qué operación cuelgan.
  [
    `CREATE TABLE archivos_entrega (
      ruta TEXT PRIMARY KEY NOT NULL,
      id_operacion TEXT NOT NULL REFERENCES operaciones_pendientes (id_operacion) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      bytes INTEGER NOT NULL
    )`,
    `INSERT INTO archivos_entrega (ruta, id_operacion, tipo, bytes)
      SELECT a.ruta, COALESCE(o.depende_de, a.id_operacion), a.tipo, a.bytes
      FROM archivos a JOIN operaciones_pendientes o ON o.id_operacion = a.id_operacion`,
    'DROP TABLE archivos',
    'ALTER TABLE archivos_entrega RENAME TO archivos',
    'CREATE INDEX archivos_operacion ON archivos (id_operacion)',
    "DELETE FROM operaciones_pendientes WHERE tipo IN ('foto', 'firma')",
    // Cuerpo de la entrega con los nombres de Fluor (versión 2).
    `UPDATE operaciones_pendientes SET version_cuerpo = 2, cuerpo = json_object(
      'guia', json_extract(cuerpo, '$.codigo_guia_pk'),
      'fecha_entrega', json_extract(cuerpo, '$.fecha_entrega'),
      'recibe', json_extract(cuerpo, '$.recibe'),
      'recibe_parentesco', json_extract(cuerpo, '$.parentesco'),
      'recibe_numero_identificacion', json_extract(cuerpo, '$.numero_identificacion'),
      'recibe_celular', json_extract(cuerpo, '$.celular'),
      'latitud', json_extract(cuerpo, '$.latitud'),
      'longitud', json_extract(cuerpo, '$.longitud')
    )
    WHERE tipo = 'entrega' AND version_cuerpo = 1`,
  ],
];
