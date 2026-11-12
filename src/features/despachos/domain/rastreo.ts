type DespachoRastreable = {
  tenantDespachoId: number;
  terminadoEn: number | null;
  liberado: boolean;
};

/**
 * Se comparte la ubicación mientras el despacho está en curso: ni terminado
 * por el conductor ni liberado por la empresa (docs/rastreo.md).
 */
export const puedeRastrearse = (despacho: DespachoRastreable) =>
  despacho.terminadoEn === null && !despacho.liberado;

/**
 * El rastreo activo ya no corresponde a ningún despacho en curso del teléfono:
 * lo terminó, lo desvinculó o la empresa lo liberó. No se pasa solo a otro
 * despacho: el siguiente arranca cuando el conductor lo abre.
 */
export const debeDetenerse = (
  rastreada: number | null,
  despachos: readonly DespachoRastreable[],
) =>
  rastreada !== null &&
  !despachos.some(d => d.tenantDespachoId === rastreada && puedeRastrearse(d));
