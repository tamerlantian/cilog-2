import {z} from 'zod';

import {cliente} from '@/core/api';
import type {ArchivoOperacion} from '@/core/sync';

import {encabezadoDespacho} from './despachos';
import {comoArchivo, TIEMPO_ENTREGA_MS} from './entrega';

const esquemaTipoNovedad = z.object({
  codigo_novedad_tipo_pk: z.string(),
  nombre: z.string().nullable(),
});

export type TipoNovedadFluor = z.infer<typeof esquemaTipoNovedad>;

/**
 * `GET /tte/movil/novedad-tipo`: los tipos con `aplica_movil` de la
 * empresa del despacho, sin paginar. Va con la asignación, como las demás
 * rutas del repartidor (no tiene `user_tenant` en la empresa).
 */
export const descargarTiposNovedadApi = async (tenantDespachoId: number) => {
  const {data} = await cliente.get('/tte/movil/novedad-tipo', {
    headers: encabezadoDespacho(tenantDespachoId),
  });
  return z.array(esquemaTipoNovedad).parse(data);
};

const esquemaNovedad = z.object({
  codigo_novedad_pk: z.number(),
  ficheros_con_error: z.number().default(0),
});

export type RespuestaNovedad = z.infer<typeof esquemaNovedad>;

/**
 * `POST /tte/movil/guia/novedad`: la novedad y sus fotos en una sola petición
 * multipart, igual que la entrega (docs/contratos-fluor.md §6).
 */
export const reportarNovedadApi = async ({
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

  const {data} = await cliente.post('/tte/movil/guia/novedad', formulario, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...encabezadoDespacho(tenantDespachoId),
    },
    timeout: TIEMPO_ENTREGA_MS,
  });
  return esquemaNovedad.parse(data);
};
