/**
 * TEMPORAL: quitar cuando Fluor (o los QR) usen el tenant directamente.
 *
 * El conductor escribe (o el QR trae) el código de operador de la app
 * anterior (`codigo_operador_pk`), pero Fluor espera el `tenant`. Esta tabla
 * los traduce mientras termina ese desarrollo. Los códigos que no están aquí
 * (o que coinciden con su tenant: 38, 66, 67, 77, 82, 83) se envían tal cual.
 *
 * Para retirarlo: borrar este archivo y su uso en `useVincularDespacho`.
 */
const TENANT_POR_OPERADOR: Readonly<Record<number, number>> = {
  12: 21, // EMPRESA DEMO S.A.S
  16: 32, // VELOENVIOS S.A.S
  17: 2, // LOGICUARTAS
  18: 4, // ENERGY LOGISTICA S.A.S
  31: 35, // LOGIMAG
};

export const tenantDeOperador = (operador: number): number =>
  TENANT_POR_OPERADOR[operador] ?? operador;
