// Hermes expone atob, pero los tipos de React Native no lo declaran.
declare function atob(datos: string): string;

/** Segundos de margen para considerar vencido un token antes de que lo rechace el servidor. */
const MARGEN_SEGUNDOS = 30;

const decodificarBase64Url = (texto: string): string => {
  const base64 = texto.replace(/-/g, '+').replace(/_/g, '/');
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(base64 + relleno);
};

/** Lee `exp` (en segundos) del JWT sin verificar la firma; solo sirve para decidir si pedir login. */
export const leerExpiracion = (token: string): number | null => {
  try {
    const carga = token.split('.')[1];
    if (!carga) return null;
    const {exp} = JSON.parse(decodificarBase64Url(carga)) as {exp?: unknown};
    return typeof exp === 'number' ? exp : null;
  } catch {
    return null;
  }
};

export const tokenVencido = (token: string, ahora = Date.now()): boolean => {
  const exp = leerExpiracion(token);
  if (exp === null) return true;
  return exp - MARGEN_SEGUNDOS <= ahora / 1000;
};
