import type {NavigatorScreenParams} from '@react-navigation/native';

/**
 * Pestañas de la pantalla de inicio. `Cuenta` la registra la app (feature
 * cuenta); aquí solo se nombra para poder navegar a ella.
 */
export type RutasPestanas = {
  MisDespachos: undefined;
  Envios: undefined;
  Cuenta: undefined;
};

/** Rutas de la feature. La app las compone con las demás en `app/navegacion/rutas.ts`. */
export type RutasDespachos = {
  /** Las pestañas. Para abrir una desde otra pantalla: `navigate('Inicio', {screen: 'Envios'})`. */
  Inicio: NavigatorScreenParams<RutasPestanas> | undefined;
  VincularDespacho: undefined;
  /** `verPendientes`: al cambiar (p. ej. `Date.now()`), la lista vuelve a pendientes sin búsqueda. */
  Despacho: {tenantDespachoId: number; verPendientes?: number};
  Guia: {tenantDespachoId: number; codigoGuia: number};
  /** Una o varias guías del despacho: se entregan juntas con la misma evidencia. */
  Entregar: {tenantDespachoId: number; codigosGuia: number[]};
  Novedad: {tenantDespachoId: number; codigosGuia: number[]};
};
