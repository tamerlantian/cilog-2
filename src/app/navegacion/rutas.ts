import type {RutasAuth} from '@/features/auth';

/** Rutas de la app. Se muestran según el estado de la sesión. */
export type ParametrosRutas = RutasAuth & {
  Empresa: undefined;
  Inicio: undefined;
};
