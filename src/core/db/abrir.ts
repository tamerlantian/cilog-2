import {open, type Scalar} from '@op-engineering/op-sqlite';

import {crearBase, establecerBase, migrar} from './base';

const NOMBRE = 'cilog.db';

/**
 * Abre la base del teléfono y la deja migrada. Se llama una vez al arrancar,
 * antes de mostrar despachos o encolar operaciones.
 */
export const abrirBase = async () => {
  const conexion = open({name: NOMBRE});
  // WAL: lecturas y escrituras no se bloquean y un corte de energía no corrompe la base.
  await conexion.execute('PRAGMA journal_mode = WAL');
  await conexion.execute('PRAGMA foreign_keys = ON');
  establecerBase(
    crearBase(async (consulta, params) => {
      const {rawRows} = await conexion.executeRaw(consulta, params as Scalar[]);
      return rawRows ?? [];
    }),
  );
  await migrar();
};
