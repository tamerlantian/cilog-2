/**
 * Clave de entidad de una guía en la cola de operaciones. El código de guía se
 * repite entre empresas, por eso va con el despacho.
 */
export const claveGuia = (tenantDespachoId: number, codigoGuia: number) =>
  `guia:${tenantDespachoId}:${codigoGuia}`;
