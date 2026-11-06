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
  Despacho: {tenantDespachoId: number};
  Guia: {tenantDespachoId: number; codigoGuia: number};
  Entregar: {tenantDespachoId: number; codigoGuia: number};
  /** `guardadaEn`: la hora que se muestra, en milisegundos. */
  EntregaGuardada: {
    tenantDespachoId: number;
    codigoGuia: number;
    guardadaEn: number;
  };
  Novedad: {tenantDespachoId: number; codigoGuia: number};
};
