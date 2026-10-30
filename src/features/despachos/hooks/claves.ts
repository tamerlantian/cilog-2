/** Query keys de la feature. Todo cuelga de 'despachos' para invalidarlo junto cuando cambia la base local. */
export const clavesDespachos = {
  todo: ['despachos'] as const,
  lista: (usuarioId: number) => ['despachos', 'lista', usuarioId] as const,
  despacho: (tenantDespachoId: number) =>
    ['despachos', 'despacho', tenantDespachoId] as const,
  guias: (tenantDespachoId: number) =>
    ['despachos', 'guias', tenantDespachoId] as const,
  guia: (tenantDespachoId: number, codigoGuia: number) =>
    ['despachos', 'guia', tenantDespachoId, codigoGuia] as const,
  envios: (usuarioId: number) => ['despachos', 'envios', usuarioId] as const,
  resumenEnvios: (usuarioId: number) =>
    ['despachos', 'resumenEnvios', usuarioId] as const,
};
