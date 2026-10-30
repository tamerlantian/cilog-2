import {abrirBase} from '@/core/db';

/** Base nueva y migrada en cada llamada: op-sqlite está simulado con SQLite en memoria. */
export const abrirBaseMemoria = () => abrirBase();
