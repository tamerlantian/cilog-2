/** Formatos de pantalla. Fluor manda fechas ISO sin zona: son hora de Colombia. */

const MESES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** "30 oct" a partir de "2026-10-30T07:30:00". Null si no hay fecha. */
export const fechaCorta = (iso: string | null) => {
  const partes = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!partes) return null;
  return `${Number(partes[3])} ${MESES[Number(partes[2]) - 1]}`;
};

/** "$ 18.000" sin decimales, con punto de miles como en Colombia. */
export const pesos = (valor: number) =>
  `$ ${Math.round(valor)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;

/** "12,5" con coma decimal; enteros sin decimales. */
export const numero = (valor: number) =>
  Number.isInteger(valor) ? String(valor) : valor.toFixed(1).replace('.', ',');

/** "30 oct 14:05" en la hora del teléfono, para lo que registró la app. */
export const fechaHora = (milisegundos: number) => {
  const fecha = new Date(milisegundos);
  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
};
