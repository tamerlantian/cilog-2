import {z} from 'zod';

import {cliente, paginaDe} from '@/core/api';

/** Asignación de un despacho al repartidor (`mas_tenant_despacho`). */
const esquemaAsignacion = z.object({
  id: z.number(),
  fecha: z.string(),
  tenant_id: z.number(),
  tenant_nombre: z.string().nullable(),
  codigo_despacho: z.number(),
});

export type Asignacion = z.infer<typeof esquemaAsignacion>;

const esquemaGuia = z.object({
  codigo_despacho_detalle: z.number(),
  codigo_guia: z.number(),
  documento_cliente: z.string().nullable(),
  nombre_remitente: z.string().nullable(),
  nombre_destinatario: z.string().nullable(),
  direccion_destinatario: z.string().nullable(),
  telefono_destinatario: z.string().nullable(),
  ciudad_destino: z.string().nullable(),
  unidades: z.number(),
  peso_real: z.number(),
  vr_recaudo: z.number(),
  vr_cobro_entrega: z.number(),
  orden_ruta: z.number().nullable(),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  requiere_cita: z.boolean(),
  comentario: z.string().nullable(),
  estado_entregado: z.boolean(),
  estado_novedad: z.boolean(),
  fecha_entrega: z.string().nullable(),
});

const esquemaDespachoGuias = z.object({
  tenant_despacho_id: z.number(),
  tenant_id: z.number(),
  tenant_nombre: z.string().nullable(),
  codigo_despacho: z.number(),
  numero: z.number().nullable(),
  fecha_salida: z.string().nullable(),
  total: z.number(),
  guias: z.array(esquemaGuia),
});

export type GuiaFluor = z.infer<typeof esquemaGuia>;
export type DespachoGuias = z.infer<typeof esquemaDespachoGuias>;

const esquemaPaginaAsignaciones = paginaDe(esquemaAsignacion);
const TAMANO_PAGINA = 100;

/** Todos los despachos asignados al usuario, de todas las empresas. */
export const listarAsignacionesApi = async (): Promise<Asignacion[]> => {
  const todas: Asignacion[] = [];
  for (let page = 1; ; page++) {
    const {data} = await cliente.get('/mas/tenant-despacho/lista', {
      params: {page, size: TAMANO_PAGINA},
    });
    const pagina = esquemaPaginaAsignaciones.parse(data);
    todas.push(...pagina.items);
    if (pagina.items.length < TAMANO_PAGINA || todas.length >= pagina.total) {
      return todas;
    }
  }
};

export type DatosVincular = {
  tenantId: number;
  codigoDespacho: number;
  token: string;
};

/**
 * Asigna el despacho al usuario si el token coincide. Fluor responde 404 si la
 * empresa, el despacho o el token no sirven (no dice cuál) y 409 si es de otro.
 */
export const vincularDespachoApi = async (datos: DatosVincular) => {
  const {data} = await cliente.post('/mas/tenant-despacho/cargar', {
    tenant_id: datos.tenantId,
    codigo_despacho: datos.codigoDespacho,
    token_despacho: datos.token,
  });
  return esquemaAsignacion.parse(data);
};

export const desvincularDespachoApi = async (tenantDespachoId: number) => {
  await cliente.delete(`/mas/tenant-despacho/eliminar/${tenantDespachoId}`);
};

/** Fluor saca de la asignación el acceso del repartidor y la empresa. */
export const encabezadoDespacho = (tenantDespachoId: number) => ({
  'X-Tenant-Despacho-ID': String(tenantDespachoId),
});

/** Todas las guías del despacho, para trabajar sin señal. */
export const descargarGuiasApi = async (tenantDespachoId: number) => {
  const {data} = await cliente.get('/tte/movil/guias', {
    headers: encabezadoDespacho(tenantDespachoId),
  });
  return esquemaDespachoGuias.parse(data);
};
