import {eq} from 'drizzle-orm';

import {despachos, escribir, leer, migrar} from '@/core/db';

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
