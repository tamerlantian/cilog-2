import type {RutasAuth} from '@/features/auth';
import type {RutasDespachos} from '@/features/despachos';

/** Rutas de la app. Se muestran según el estado de la sesión. */
export type ParametrosRutas = RutasAuth &
  RutasDespachos & {
    Empresa: undefined;
  };
