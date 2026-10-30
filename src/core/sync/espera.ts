/** Espera tras cada fallo transitorio; el último valor se repite. */
const ESPERAS_MS = [5_000, 15_000, 60_000, 300_000, 900_000];

/** ±20 % para que muchos teléfonos no reintenten a la vez cuando Fluor vuelva. */
const VARIACION = 0.2;

/**
 * Milisegundos hasta el próximo intento. `intentos` cuenta el que acaba de
 * fallar (1 = primer fallo). Si Fluor mandó `Retry-After`, se respeta.
 */
export const calcularEspera = (
  intentos: number,
  aleatorio: () => number = Math.random,
  reintentarEnSegundos: number | null = null,
) => {
  const indice = Math.min(Math.max(intentos, 1), ESPERAS_MS.length) - 1;
  const base = ESPERAS_MS[indice] ?? ESPERAS_MS[ESPERAS_MS.length - 1]!;
  const conVariacion = Math.round(
    base * (1 + (aleatorio() * 2 - 1) * VARIACION),
  );
  return Math.max(conVariacion, (reintentarEnSegundos ?? 0) * 1000);
};
