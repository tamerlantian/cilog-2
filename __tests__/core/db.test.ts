import {open, type Scalar} from '@op-engineering/op-sqlite';
import {eq} from 'drizzle-orm';

import {
  archivos,
  crearBase,
  despachos,
  escribir,
  establecerBase,
  leer,
  migrar,
  operaciones,
} from '@/core/db';
import {MIGRACIONES} from '@/core/db/migraciones';

import {abrirBaseMemoria} from '../baseMemoria';

const despacho = (id: number) => ({
  tenantDespachoId: id,
  usuarioId: 1,
  tenantId: 7,
  tenantNombre: 'Transportes Sur',
  codigoDespacho: 900 + id,
  asignadoEn: '2026-10-30T07:00:00',
});

describe('base local', () => {
  beforeEach(abrirBaseMemoria);

  it('crea las tablas y deja la versión de esquema', async () => {
    await escribir(tx => tx.insert(despachos).values(despacho(1)));
    const filas = await leer(db => db.select().from(despachos));
    expect(filas).toEqual([
      expect.objectContaining({tenantDespachoId: 1, liberado: false}),
    ]);
  });

  it('migrar de nuevo no repite migraciones ni pierde datos', async () => {
    await escribir(tx => tx.insert(despachos).values(despacho(1)));
    await migrar();
    expect(await leer(db => db.select().from(despachos))).toHaveLength(1);
  });

  it('si la escritura falla a mitad, no queda nada guardado', async () => {
    await expect(
      escribir(async tx => {
        await tx.insert(despachos).values(despacho(1));
        throw new Error('disco lleno');
      }),
    ).rejects.toThrow('disco lleno');
    expect(await leer(db => db.select().from(despachos))).toHaveLength(0);
  });

  it('las escrituras concurrentes no se mezclan en una misma transacción', async () => {
    const fallida = escribir(async tx => {
      await tx.insert(despachos).values(despacho(1));
      await new Promise(r => setTimeout(() => r(undefined), 5));
      throw new Error('falla');
    });
    // Llega mientras la primera tiene la transacción abierta.
    const buena = escribir(tx => tx.insert(despachos).values(despacho(2)));

    await expect(fallida).rejects.toThrow('falla');
    await buena;
    const filas = await leer(db =>
      db.select().from(despachos).where(eq(despachos.tenantDespachoId, 2)),
    );
    expect(filas).toHaveLength(1);
    expect(await leer(db => db.select().from(despachos))).toHaveLength(1);
  });
});

describe('migración 3: las fotos viajan con la entrega', () => {
  /** Base en la versión 2, con una entrega y su foto y firma como operaciones aparte. */
  const baseVersion2 = async () => {
    const conexion = open({name: 'v2.db'});
    await conexion.execute('PRAGMA foreign_keys = ON');
    establecerBase(
      crearBase(async (consulta, params) => {
        const {rawRows} = await conexion.executeRaw(
          consulta,
          params as Scalar[],
        );
        return rawRows ?? [];
      }),
    );
    for (const sentencia of [...MIGRACIONES[0]!, ...MIGRACIONES[1]!]) {
      await conexion.execute(sentencia);
    }
    await conexion.execute('PRAGMA user_version = 2');

    const operacion = `INSERT INTO operaciones_pendientes
      (id_operacion, usuario_id, tipo, clave_entidad, tenant_despacho_id, depende_de, cuerpo, estado, proximo_intento, creada_en)
      VALUES (?, 1, ?, ?, 10, ?, ?, 'pendiente', 0, ?)`;
    await conexion.execute(operacion, [
      'entrega-1',
      'entrega',
      'guia:10:1',
      null,
      JSON.stringify({
        codigo_guia_pk: 1,
        codigo_despacho_fk: 910,
        recibe: 'Ana',
        numero_identificacion: '43123456',
        parentesco: 'TITULAR',
        celular: null,
        fecha_entrega: '2026-11-06T10:42:13',
        latitud: 6.25,
        longitud: -75.56,
      }),
      1,
    ]);
    const archivo =
      'INSERT INTO archivos (id_operacion, ruta, tipo, bytes) VALUES (?, ?, ?, ?)';
    for (const [id, tipo, ruta, letra] of [
      ['foto-1', 'foto', '/e/a.jpg', 'I'],
      ['firma-1', 'firma', '/e/b.png', 'F'],
    ] as const) {
      await conexion.execute(operacion, [
        id,
        tipo,
        `archivo:entrega-1:${id}`,
        'entrega-1',
        '{}',
        2,
      ]);
      await conexion.execute(archivo, [id, ruta, letra, 100]);
    }
  };

  it('pasa los archivos a la entrega y convierte su cuerpo al de Fluor', async () => {
    await baseVersion2();

    await migrar();

    const cola = await leer(db => db.select().from(operaciones));
    expect(cola.map(o => [o.idOperacion, o.versionCuerpo])).toEqual([
      ['entrega-1', 2],
    ]);
    expect(JSON.parse(cola[0]!.cuerpo)).toEqual({
      guia: 1,
      fecha_entrega: '2026-11-06T10:42:13',
      recibe: 'Ana',
      recibe_parentesco: 'TITULAR',
      recibe_numero_identificacion: '43123456',
      recibe_celular: null,
      latitud: 6.25,
      longitud: -75.56,
    });
    expect(
      (await leer(db => db.select().from(archivos))).map(a => [
        a.idOperacion,
        a.ruta,
      ]),
    ).toEqual([
      ['entrega-1', '/e/a.jpg'],
      ['entrega-1', '/e/b.png'],
    ]);
  });
});
