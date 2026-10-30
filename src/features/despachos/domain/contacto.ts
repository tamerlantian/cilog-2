/** Enlaces para llamar y abrir el mapa desde el detalle de la guía. */

/** `tel:` con solo dígitos y `+`; null si no queda un número usable. */
export const enlaceLlamar = (telefono: string | null) => {
  const limpio = telefono?.replace(/[^\d+]/g, '') ?? '';
  return limpio.length >= 7 ? `tel:${limpio}` : null;
};

/**
 * Google Maps abre en la app si está instalada y si no en el navegador, en
 * Android y en iOS. Con coordenadas va al punto exacto; si no, busca la dirección.
 */
export const enlaceMapa = (guia: {
  latitud: number | null;
  longitud: number | null;
  direccionDestinatario: string | null;
  ciudadDestino: string | null;
}) => {
  const consulta =
    guia.latitud !== null && guia.longitud !== null
      ? `${guia.latitud},${guia.longitud}`
      : [guia.direccionDestinatario, guia.ciudadDestino]
          .filter(Boolean)
          .join(', ');
  if (!consulta) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
};
