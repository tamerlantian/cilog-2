import {z} from 'zod';

import {cliente} from '@/core/api';
import {uriEvidencia} from '@/core/archivos';
import type {ArchivoOperacion} from '@/core/sync';

import {encabezadoDespacho} from './despachos';

const esquemaEntrega = z.object({
  codigo_guia_pk: z.number(),
  estado_entregado: z.boolean(),
  ficheros_con_error: z.number().default(0),
});

export type RespuestaEntrega = z.infer<typeof esquemaEntrega>;

/** Una entrega completa pesa ~1 MB: con señal débil tarda más que una consulta. */
const TIEMPO_ENTREGA_MS = 60_000;

const comoArchivo = ({ruta, tipo}: ArchivoOperacion, indice: number) =>
  tipo === 'F'
    ? {uri: uriEvidencia(ruta), name: 'firma.png', type: 'image/png'}
    : {
        uri: uriEvidencia(ruta),
        name: `foto-${indice + 1}.jpg`,
        type: 'image/jpeg',
      };

/**
 * `POST /tte/movil/guia/entrega`: la entrega, las fotos y la firma en una sola
 * petición multipart (docs/offline.md §12.1). Fluor valida el acceso por la
 * asignación del despacho, no por la empresa activa de la sesión.
 */
export const entregarGuiaApi = async ({
  tenantDespachoId,
  datos,
  archivos,
}: {
  tenantDespachoId: number;
  datos: unknown;
  archivos: readonly ArchivoOperacion[];
}) => {
  const formulario = new FormData();
  formulario.append('datos', JSON.stringify(datos));
  archivos
    .filter(a => a.tipo === 'I')
    .forEach((archivo, i) =>
      formulario.append('imagenes', comoArchivo(archivo, i) as never),
    );
  const firma = archivos.find(a => a.tipo === 'F');
  if (firma) formulario.append('firma', comoArchivo(firma, 0) as never);

  const {data} = await cliente.post('/tte/movil/guia/entrega', formulario, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...encabezadoDespacho(tenantDespachoId),
    },
    timeout: TIEMPO_ENTREGA_MS,
  });
  return esquemaEntrega.parse(data);
};
