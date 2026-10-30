/** Rutas de la feature. La app las compone con las demás en `app/navegacion/rutas.ts`. */
export type RutasDespachos = {
  MisDespachos: undefined;
  VincularDespacho: undefined;
  Despacho: {tenantDespachoId: number};
  Guia: {tenantDespachoId: number; codigoGuia: number};
  Entregar: {tenantDespachoId: number; codigoGuia: number};
  Novedad: {tenantDespachoId: number; codigoGuia: number};
  Envios: undefined;
  /** La registra la app (feature cuenta); aquí solo se navega a ella. */
  Cuenta: undefined;
};
