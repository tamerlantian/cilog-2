import {sql} from 'drizzle-orm';
import {drizzle, type SqliteRemoteDatabase} from 'drizzle-orm/sqlite-proxy';

import {esquema, type Esquema} from './esquema';
import {MIGRACIONES} from './migraciones';

/** Ejecuta SQL y devuelve las filas como arreglos de valores (orden de columnas). */
export type EjecutorSql = (
  sql: string,
  params: unknown[],
) => Promise<unknown[][]>;

export type Base = SqliteRemoteDatabase<Esquema>;
/** El `tx` que recibe `escribir`. */
type Transaccion = Parameters<Parameters<Base['transaction']>[0]>[0];
/** Lo que reciben los repositorios: la base o una transacción en curso. */
export type Consulta = Base | Transaccion;

/**
 * drizzle sobre `sqlite-proxy`, no sobre su driver de op-sqlite: ese driver
 * llama a una API vieja de op-sqlite y no espera el callback antes del COMMIT.
 * Con el proxy, el mismo código corre sobre op-sqlite en el teléfono y sobre
 * libsql en Jest.
 */
export const crearBase = (ejecutar: EjecutorSql): Base =>
  drizzle(
    async (consulta, params, metodo) => {
      const filas = await ejecutar(consulta, params);
      if (metodo === 'run') return {rows: []};
      // En `get` el proxy espera una sola fila, no una lista.
      return {rows: metodo === 'get' ? (filas[0] as unknown[]) : filas};
    },
    {schema: esquema},
  );

let base: Base | null = null;
let cola: Promise<unknown> = Promise.resolve();

export const establecerBase = (nueva: Base | null) => {
  base = nueva;
  cola = Promise.resolve();
};

const obtener = () => {
  if (!base) throw new Error('La base local no está abierta.');
  return base;
};

/**
 * Hay una sola conexión: si una consulta corriera mientras otra función tiene
 * una transacción abierta, quedaría dentro de ella. Por eso todo acceso pasa
 * por esta fila, de a uno.
 */
const enFila = <T>(fn: () => Promise<T>): Promise<T> => {
  const resultado = cola.then(fn);
  cola = resultado.catch(() => undefined);
  return resultado;
};

/** Lecturas. No abre transacción. */
export const leer = <T>(fn: (db: Base) => Promise<T>) =>
  enFila(() => fn(obtener()));

/** Escrituras: todo o nada. Si `fn` lanza, se deshace. */
export const escribir = <T>(fn: (tx: Transaccion) => Promise<T>) =>
  enFila(() => obtener().transaction(fn));

/** Lleva la base a la última versión de `MIGRACIONES`. */
export const migrar = async () => {
  const [fila] = await leer(db =>
    db.values<[number]>(sql`PRAGMA user_version`),
  );
  const actual = Number(fila?.[0] ?? 0);
  for (let version = actual + 1; version <= MIGRACIONES.length; version++) {
    const sentencias = MIGRACIONES[version - 1] ?? [];
    await escribir(async tx => {
      for (const sentencia of sentencias) await tx.run(sql.raw(sentencia));
      await tx.run(sql.raw(`PRAGMA user_version = ${version}`));
    });
  }
};
